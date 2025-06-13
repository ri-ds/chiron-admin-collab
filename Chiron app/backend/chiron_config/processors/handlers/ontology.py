import copy
from sqlalchemy import or_
import re

# import django.core.paginator
from chiron.processors.abstract import DisplayProcessor

# from django.core.paginator import Paginator
from django.utils.html import conditional_escape
from chiron.query_engine import get_stattool

from chiron.processors import CohortDefText, TextHandler

from chiron_config.processors.handlers.api_ontology import BioPortalApiOntologyHandler, EuroBioInfApiOntologyHandler


field_name_desc = (
    "The Django field name. If the field is in another model, the full path to that" "model can be provided."
)
ontology_name_desc = "name of the bioontology.org ontology that the concept is sourced from"

api_source_desc = "name of the api  we are using, either https://data.bioontology.org or https://www.ebi.ac.uk"


class OntologyHandler(TextHandler):
    def set_kwarg_options(self):
        self.append_handler_arg_option("field_name", field_name_desc, required=True)
        self.append_handler_arg_option("ontology_name", ontology_name_desc, required=True)
        self.append_handler_arg_option("api_source", required=True)
        self.append_handler_arg_option("string_val_separator", "", default_value=None, required=False)

    def set_cohort_def_processor(self, chironuser, dataset, concept, prefilter_value):
        ontology_name = self.get_handler_arg_value("ontology_name")
        api_source = self.get_handler_arg_value("api_source")
        display_field_name = self.get_handler_arg_value("field_name")
        self.cohort_def_processor = CohortDefOntology(
            chironuser,
            dataset,
            concept,
            prefilter_value=prefilter_value,
            ontology_name=ontology_name,
            api_source=api_source,
            display_field_name=display_field_name,
        )

    def set_display_processor(self, chironuser, concept):
        concept_model = None
        self.display_processor = DisplayOntology(chironuser, concept, model=concept_model)


class CohortDefOntology(CohortDefText):
    """
    When to use:
    * For linking terms to externally loaded ontologies
    * All values should either be a string or null,
         and should correspond to existing id's in one of the two ontology api's we are
         currently using

    """

    concept_type = "ontology"
    apihelper = None

    def _load_apihelper(self):
        if self.apihelper is None:
            if self.args["api_source"] == "https://www.ebi.ac.uk":
                self.apihelper = EuroBioInfApiOntologyHandler(self.args["api_source"], self.args["ontology_name"])
            else:
                self.apihelper = BioPortalApiOntologyHandler(self.args["api_source"], self.args["ontology_name"])
        return

    def preprocess_statistics(self, cd):
        data = {}
        app_name, collection_id, concept_id = str(self.concept).split("::")
        stats = get_stattool(self.chironuser, cd, self.concept, self.collection_prefilters)
        data["values"] = stats.lookup_unique_values()
        # adding the selected terms from the cohort definition for preselected filtering
        data["terms"] = []
        for item in cd:
            if item["collection_id"] == collection_id:
                for list_item in item["list"]:
                    if list_item["concept_id"] == concept_id:
                        for term in list_item["terms"]:
                            data["terms"].append(term)
        data["count_missing_values"] = stats.get_missing_values_count()
        data["count_subjects_with_missing_values"] = stats.get_subjects_with_missing_values_count()
        data["perf"] = stats.time_analysis
        return data

    def form_callback(self, get_data, cd):
        """
        GET args:qu

        :ontology_class: (optional, default=ONT_ROOT_ID) string of the bioontology class id
        :ontology_action: (optional, default="children") string of the action, either "parent" or "child
        :search: (optional, default="") string with search term(s) to directly query from db

        Response data dict:

        * **count** - integer, unique values
        * **action_results** - list of objects containing unique_values field
        * **parent_id** - string, bioontology.org class id of parent
        """
        # search_string = get_data.get("search", "")
        class_id_string = get_data.get("ontology_class")
        action = get_data.get("ontology_action", "children")

        base_stats = self.get_statistics(cd)
        count = len(base_stats["values"])
        self._load_apihelper()
        # Handling show data toggle, returns selected data in flat list, not very functional
        show_data = True if get_data.get("show_all_data", False) == "true" else False
        if show_data is False:
            results = []
            for val in base_stats["terms"]:
                split_val = val.split("SPLIT")
                term_rslt = {
                    "unique_values": split_val[0],
                    "class_id": split_val[1],
                    "leaf": 0,
                }
                results.append(term_rslt)
            data = {"count": count, "action_results": results, "parent_id": ""}
            data["count_subjects_with_missing_values"] = base_stats["count_subjects_with_missing_values"]
            data["count_missing_values"] = base_stats["count_missing_values"]
            return data

        # search currently unimplemnted
        # oConcept = Concept.objects.get(permanent_id=self.args["display_field_name"])
        # label_stats = get_stattool(self.chironuser, {}, oConcept, self.collection_prefilters)
        # label_stats.
        # unique_id_values = base_stats.lookup_unique_values()

        # values = list(
        #     zip(
        #         unique_label_values,
        #         unique_id_values,
        #     )
        # )
        # count = len(values)
        # if search_string:
        #     value_dict = {}  # use a dict instead of a list because it is faster to search
        #     # check regex if applicable, otherwise do normal search
        #     if search_string.startswith("/") and search_string.endswith("/"):
        #         # Handle regex search string
        #         for value in values:
        #             regex_string = search_string.strip("/")
        #             regex_match = re.search(regex_string, value)
        #             if regex_match and value[0] not in value_dict:
        #                 value_dict[value[0]] = value[1]
        #     else:
        #         # Handle search string
        #         search_string = search_string.lower()
        #         for value in values:
        #             if search_string in value[0].lower() and value[0] not in value_dict:
        #                 value_dict[value[0]] = value[1]
        #     values = list(value_dict.keys())
        #     results = []
        #     for val in values:
        #         results.append({"unique_values": val, "class_id": value_dict[val], "children": 0})
        #     data = {"count": count, "action_results": results, "parent_id": ""}
        #     return data

        # if initializing, then need a new case for multiple roots
        if class_id_string is None:
            results = self.apihelper.get_root()
            parent_id = ""

            data = {"count": count, "action_results": results, "parent_id": parent_id}
            data["count_subjects_with_missing_values"] = base_stats["count_subjects_with_missing_values"]
            data["count_missing_values"] = base_stats["count_missing_values"]
            return data

        cleaned_id_string = self.apihelper.prepare_class_id_string(class_id_string)
        # Get children of class id
        if action == "children":
            parent_id = cleaned_id_string
            results = self.apihelper.get_children(cleaned_id_string)

        # for now, if not children then it is parent, means we also need to get the parent
        else:
            results, parent_id = self.apihelper.get_parent(cleaned_id_string)

        data = {"count": count, "action_results": results, "parent_id": parent_id}
        data["count_subjects_with_missing_values"] = base_stats["count_subjects_with_missing_values"]
        data["count_missing_values"] = base_stats["count_missing_values"]
        return data

    def validate_form(self, form_data):
        """Validate Form

        Validates incoming form data.

        form_data fields:
        - chiron_text_field_selection: string with different terms separated by newline
        - exclude_selected: (optional, default False) invert the query by excluding provided values
        - include_null_and_missing: (optional, default False)

        :param form_data: Form data to validate
        :type form_data: dict
        :return: Validation pass or fail.
        :rtype: bool
        """
        # Get parameters
        self._load_apihelper()
        self.cleaned["exclude_selected"] = True if form_data.get("exclude_selected") else False
        self.cleaned["include_null_and_missing"] = True if form_data.get("include_null_and_missing") else False
        selected = form_data.get("chiron_ontology_field_selection", "")
        # Build entries list
        entries = [item["class_id"] for item in selected]
        # Initialize terms list
        terms = []
        # Get list of matching values from db
        stats = get_stattool(self.chironuser, {}, self.concept, self.collection_prefilters)
        matching_values = stats.lookup_bulk_values(entries)

        # Iterate through entries and validate them.
        # Set validated to false and add errors where applicable
        entry_idx = 0
        for entry in entries:
            if entry and entry not in terms:
                if entry.startswith("/") and entry.endswith("/"):
                    regex_val = entry[1:-1]
                    try:
                        re.compile(regex_val)
                    except re.error as e:
                        self.form_errors.append("Regex error: {}".format(str(e)))
                elif entry not in matching_values:
                    self.form_warnings.append("Entry {} not found in data".format(selected[entry_idx]["label"]))
                terms.append(selected[entry_idx]["label"] + "SPLIT" + selected[entry_idx]["class_id"])
            entry_idx += 1
        # Fail validation and add error if there are no values
        # and "include_null_and_missing" is not set
        if not terms and not self.cleaned["include_null_and_missing"]:
            self.form_errors.append("Please enter at least one value.")
        # Add terms
        self.cleaned["terms"] = terms
        if self.form_errors:
            return False
        ignore_warnings = form_data.get("ignore_warnings", False)
        if not ignore_warnings and self.form_warnings:
            return False

        return True

    def generate_cohort_def_entry(self, cd=None, existing_cd_entry=None):
        terms = self.cleaned["terms"]
        cd_entry = self._generate_cd_entry_template({"terms": terms})
        cd_entry["exclude_selected"] = self.cleaned["exclude_selected"]
        cd_entry["include_null_and_missing"] = self.cleaned["include_null_and_missing"]
        return cd_entry

    def display_entry_as_html(self, cd_entry, abbreviation="full"):
        terms = copy.copy(cd_entry["terms"])
        terms = list(map(lambda val: val.split("SPLIT")[0], terms))
        if cd_entry.get("include_null_and_missing"):
            terms.append("<em>[Not specified]</em>")
        if len(terms) == 1:
            sign = "&ne;" if cd_entry.get("exclude_selected") else "="
            return "{} {} {} and dependent terms".format(self.concept.name, sign, ", ".join(terms))
        sign = "not in" if cd_entry.get("exclude_selected") else "in"

        if len(terms) <= self.terms_display_limit:
            term_string = ", ".join(('"{}"'.format(conditional_escape(t)) for t in terms))
        else:
            term_string = ", ".join(
                ('"{}"'.format(conditional_escape(t)) for t in terms[0 : self.terms_display_limit - 1])
            )
            term_string += " ... ({} more), ".format(len(terms) - self.terms_display_limit)
            term_string += conditional_escape(terms[-1])

        return "{} {} {} and dependent terms".format(self.concept.name, sign, term_string)

    def _get_terms(self, cd_entry):
        self._load_apihelper()
        terms = set([])
        for v in cd_entry["terms"]:
            val = v.split("SPLIT")[1]
            descendants, label = self.apihelper.get_descendants(val)
            # add the term
            terms.add(val)
            terms.add("base" + val)
            # append all the descendants of the term
            terms.update(descendants)

        if cd_entry.get("include_null_and_missing"):
            terms.add("")
            terms.add(None)
        return list(terms)

    def get_sql_alchemy_clause(self, cd_entry, table):
        terms = self._get_terms(cd_entry)
        include_nulls = cd_entry.get("include_null_and_missing", False)
        column = getattr(table.c, cd_entry["concept_id"])
        if terms and include_nulls:
            return or_(column.in_(terms), column == None)  # noqa
        if terms:
            return column.in_(terms)
        if include_nulls:
            return column == None  # noqa


class DisplayOntology(DisplayProcessor):
    """
    Display Ontology
    """

    def __init__(self, chironuser, oConcept, model=None, **kwargs):
        super().__init__(chironuser, oConcept, **kwargs)

    def get_data_type(self):
        """
        Returns a human-readable string describing the data type (text, integer, etc.).
        """
        return "ontology"

    def set_aggregation_methods(self):
        super().set_aggregation_methods()
        # self.aggregation_methods.append(HasValueOntology())
