from faker import Faker

from django.conf import settings

from chiron.processors.abstract import SourceProcessor
from chiron.processors.abstract import StandardLoadMixin
import pandas as pd


def patient_iterator():
    fake = Faker(use_weighting=False)
    fake.seed_instance(4816)
    ontology_test = pd.read_csv("chiron_config/data/HP.csv", low_memory=False)
    ebi_test = pd.read_csv("chiron_config/data/bco.csv", low_memory=False)

    for i in range(settings.PATIENT_COUNT):
        dob = fake.date_of_birth(minimum_age=1, maximum_age=99)
        dod = None
        if fake.random_int(min=0, max=100, step=1) < 40:
            dod = fake.date_between(start_date=dob)

        ebi_rand = fake.random_int(min=0, max=ebi_test.shape[0] - 1, step=1)
        bio_rand = fake.random_int(min=0, max=21493, step=1)

        record = {
            "patient_id": fake.unique.numerify(text="###########"),
            "patient_firstname": fake.first_name(),
            "patient_lastname": fake.last_name(),
            "gender": fake.random_element(elements=("M", "F", None)),
            "marital_status": fake.null_boolean(),
            "patient_birthdate": dob,
            "patient_deathdate": dod,
            "healthcare_coverage": fake.random_int(min=100, max=50000, step=1),
            "healthcare_expenses": fake.random_int(min=0, max=2000000, step=1) / 100,
            "age_at_consent_days": fake.random_int(min=0, max=27000, step=1),
            "age_at_consent_years": fake.random_int(min=0, max=99, step=1),
            "bio_iri": ontology_test["Class ID"][bio_rand],
            "bio_display": ontology_test["Preferred Label"][bio_rand],
            "ebi_iri": ebi_test["iri"][ebi_rand],
            "ebi_display": ebi_test["label"][ebi_rand],
        }
        yield record


class SourcePatient(StandardLoadMixin, SourceProcessor):
    def get_source(self):
        """
        Return an iterable of dicts
        """
        iterator = patient_iterator()
        return iterator

    def get_subject_match_def(self, record):
        """
        Get subject ID from record
        """
        return record["patient_id"]

    def get_collection_id(self, record):
        """
        Get collection ID from record (not relevant for Subject collection)
        """
        return record["patient_id"]
