import datetime
from collections import Counter

from chiron.models import Concept
from chiron.processors.display.aggregation._base import AggregationMethod
from chiron.query_engine import get_stattool
from chiron import chiron_settings


class HasValueOntology(AggregationMethod):
    """
    Check for the existence of a value in the list. This can return a boolean
    result, a count of the number of matches, the date of the first or last
    match (based on the event_date_field for the collection), or all dates
    where this value occurred (again based on the event_date_field).
    """

    ontology_value_cache = None

    def __init__(self, id="has_value", label="has value", group="aggregate", model=None):
        self.id = id
        self.label = label
        self.group = group
        self.model = model

    def get_header_display_value(self, oConcept, td_entry):
        print("valueoontology")
        labels = {
            "boolean": "has value",
            "count": "count",
            "earliest_date": "first occurrence date",
            "latest_date": "latest occurrence date",
            "all_dates": "all occurrence dates",
        }
        values = td_entry.get("aggregation_settings", {}).get("values", [])
        first_value = values[0] if values else ""
        addl_values = len(values) - 1
        if addl_values < 1:
            value_str = '"{}"'.format(first_value)
        else:
            value_str = '"{}" + {} more'.format(first_value, addl_values)
        return_value = td_entry.get("aggregation_settings", {}).get("return_value", "boolean")

        if return_value == "boolean":
            return "{} has value {}".format(oConcept.name, value_str)
        return "{} has value {} ({})".format(oConcept.name, value_str, labels[return_value])

    def check_requires_event_dates(self, td_entry):
        return_value = td_entry.get("aggregation_settings", {}).get("return_value", "boolean")
        if return_value in ["earliest_date", "latest_date", "all_dates"]:
            return True
        return False

    def get_inputs(self, chironuser, td_entry):
        concept_id = td_entry["concept_id"]
        oConcept = Concept.objects.get(permanent_id=concept_id)
        stats = get_stattool(chironuser, {}, oConcept)
        values = stats.lookup_unique_values(1000)
        options = []
        for val in values:
            options.append((val, val))
        inputs = [
            {
                "id": "values",
                "label": "value(s)",
                "type": "multiselect",
                "selected": td_entry.get("aggregation_settings", {}).get("values", ""),
                "options": options,
            },
            {
                "id": "return_value",
                "label": "return value",
                "type": "select",
                "selected": td_entry.get("aggregation_settings", {}).get("return_value", "boolean"),
                "options": [
                    ("boolean", "True/False"),
                    ("count", "Count (how many times does value occur)"),
                    ("earliest_date", "Date of first occurrence of value"),
                    ("latest_date", "Date of most recent occurrence of value"),
                    ("all_dates", "All dates where value occurred"),
                ],
            },
        ]
        return inputs

    def set_custom_settings(self, input_data):
        values = input_data.get("values", [])
        return_value = input_data.get("return_value", "boolean")
        return {
            "values": values,
            "return_value": return_value,
        }

    def aggregate(self, td_entry, value, display_processor_sort_value_func=None):
        print("AGGREGATING")
        selected_values = td_entry.get("aggregation_settings", {}).get("values", [])
        # If ontology value cache is None, set it before use
        if not self.ontology_value_cache:
            self.ontology_value_cache = self._get_ontology_values(selected_values)
        final_selected_values = self.ontology_value_cache
        return_value = td_entry.get("aggregation_settings", {}).get("return_value", "boolean")
        concept_id = td_entry["concept_id"]
        value = self._merge_duplicates_for_different_subjects(concept_id, value)
        if return_value == "boolean":
            if not value:
                return False
            value = self._get_value_list_no_nulls(concept_id, value)
            if any(x in value for x in final_selected_values):
                return True
            return False
        elif return_value == "count":
            if not value:
                return 0
            value = self._get_value_list_no_nulls(concept_id, value)
            total_count = sum([count for key, count in Counter(value).items() if key in final_selected_values])
            return total_count
        else:
            if not value:
                return None
            event_date_field = td_entry["collection"]["event_date_field"]
            value = self._get_event_list(concept_id, event_date_field, value)
            value = [x[0] for x in value if x[1] in final_selected_values]
            if not value:
                return None
            value = list(set(value))
            value.sort()
            if return_value == "all_dates":
                return value
            elif return_value == "earliest_date":
                return value[0]
            elif return_value == "latest_date":
                return value[-1]

        # the code should never reach this point
        return None

    def get_display_value3(self, td_entry, value, default_value_method, output_type):
        if output_type == "python":
            return value
        return_value = td_entry.get("aggregation_settings", {}).get("return_value", "boolean")
        if return_value == "count":
            if output_type == "html":
                return str(value)
            return value
        if return_value in ["all_dates"]:
            if output_type == "json":
                return [self._date_to_string(x) for x in value]
            return chiron_settings.CHIRON_AGG_DELIMITER.join([self._date_to_string(x) for x in value])
        if return_value in ["earliest_date", "latest_date"]:
            return self._date_to_string(value)
        # t/f response
        if output_type in ["html", "csv"]:
            return str(value)
        return value

    def get_sort_key_function(
        self,
        display_processor_sort_value_func,
        column_index,
        reverse,
        aggregation_settings,
    ):
        self.column_index = column_index
        self.display_processor_sort_value_func = display_processor_sort_value_func
        self.reverse = reverse
        self.aggregation_settings = aggregation_settings
        return_value = self.aggregation_settings.get("return_value", "boolean")
        if return_value in ["all_dates"]:
            return self.get_sort_key_date_list
        if return_value in ["earliest_date", "latest_date"]:
            return self.get_sort_key_date
        return self.get_sort_key

    def get_sort_key_date_list(self, value):
        val = value[self.column_index]
        response = []
        if val is None or len(val) == 0:
            response.append(self._get_sort_key_date(None))
        else:
            if self.reverse:
                val = reversed(val)
            for entry in val:
                response.append(self._get_sort_key_date(entry))
        return response

    def _get_sort_key_date(self, value):
        """
        This can be used to sort date values
        """
        if value is None:
            return datetime.datetime(datetime.MINYEAR, 1, 1)
        return value

    def _get_ontology_values(self, selected_values):
        """Get Ontology Values

        Get additional values for an Ontology given a selected value.

        :param selected_value: Selected value
        :type selected_value: list
        :return: Additional values
        """
        # if self.model:
        #     entries_to_add = []
        #     for item in selected_values:
        #         ontology_entry = self.model.objects.get(description=item)
        #         if not ontology_entry.terminal:
        #             children_list = ontology_entry.get_children_flat_list()
        #             for child in children_list:
        #                 entries_to_add.append(child.description)
        #     new_values = selected_values + entries_to_add
        #     return new_values
        # else:
        #     return selected_values
        print("SELECTED")
        print(selected_values)
        return selected_values
