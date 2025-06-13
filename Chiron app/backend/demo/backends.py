from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.backends import RemoteUserBackend

from chiron.models import ChironUser, Dataset
from chiron.models.data_definition_models import PermissionGroup


UserModel = get_user_model()


def get_or_create_default_dataset():
    # create default dataset
    dataset = Dataset.objects.get(
        unique_id="performance_tests",
    )
    return dataset


class ChironRemoteUserBackend(RemoteUserBackend):
    def authenticate(self, request, remote_user):
        """
        The username passed as ``remote_user`` is considered trusted. Return
        the ``User`` object with the given username. Create a new ``User``
        object if ``create_unknown_user`` is ``True``.

        Return None if ``create_unknown_user`` is ``False`` and a ``User``
        object with the given username is not found in the database.
        """
        if not remote_user:
            return
        user = None
        username = self.clean_username(remote_user).lower()

        # try to pull extra information from the headers and default
        # to the username for the fields if they are not present
        user_data = {
            UserModel.USERNAME_FIELD: username,
            "email": request.META.get("HTTP_SSO_EMAIL", request.META.get("HTTP_EMAIL", username)).lower(),
            "first_name": request.META.get("HTTP_SSO_FNAME", request.META.get("HTTP_FNAME", username)),
            "last_name": request.META.get("HTTP_SSO_LNAME", request.META.get("HTTP_LNAME", username)),
            "groups": request.META.get("HTTP_SSO_MEMBER"),
        }

        try:
            # try to find a user by username
            user = UserModel._default_manager.get(username__iexact=username)
        except UserModel.DoesNotExist:
            # fall back to email address (and create if does not exist)
            user, _ = UserModel._default_manager.get_or_create(
                username=user_data.get(UserModel.USERNAME_FIELD),
                email__iexact=user_data.get("email"),
            )

        # configure the user based on the header values
        user = self.configure_user(user, user_data)

        return user if self.user_can_authenticate(user) else None

    def configure_user(self, user, user_data):
        """Updates the user based upon the user_data entries

        :param user: The user object to configure
        :type user: django.contrib.auth.models.User
        :param user_data: The user headers passed in
        :type user_data: dict
        :return: The modified user object
        :rtype: django.contrib.auth.models.User
        """
        user.username = user_data.get("username")
        user.first_name = user_data.get("first_name")
        user.last_name = user_data.get("last_name")
        user.email = user_data.get("email")
        user.save()

        dataset = get_or_create_default_dataset()
        # get or create the Chiron user to ensure a user has a ChironUser
        chiron_user, _ = ChironUser.objects.get_or_create(user=user, dataset=dataset)

        if settings.AUTO_MANAGE_GROUPS:
            all_groups = user_data.get("groups").split(";") if user_data.get("groups") else []
            # remove groups no longer in
            not_valid_groups = chiron_user.permission_groups.exclude(name__in=all_groups)
            chiron_user.permission_groups.remove(*not_valid_groups)

            # update groups
            for group in all_groups:
                perm_group, _ = PermissionGroup.objects.get_or_create(name=group, dataset=dataset)
                chiron_user.permission_groups.add(perm_group)

            # ensure default user permissions
            if len(all_groups) == 0:
                try:
                    default = PermissionGroup.objects.get(name="default_user")
                    chiron_user.permission_groups.add(default)
                except PermissionGroup.DoesNotExist:
                    pass

            # set phi access for those in PCGC3 group
            if "PCGC3" in all_groups:
                chiron_user.access_level = "phi"
            else:
                chiron_user.access_level = "deid"

            chiron_user.save()

        return user
