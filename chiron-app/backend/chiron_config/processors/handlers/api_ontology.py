import json
import requests


class BaseOntologyApiHandler:
    def __init__(self, api_source, ontology_name):
        self.api_source = api_source
        self.ontology_name = ontology_name
        self.clean_func = lambda x: x
        self.leaf_func = lambda x: 0

    # encode label/class string
    def prepare_class_id_string(self, input_string):
        return self.clean_func(input_string)

    def search(self):
        # might have to implement this?
        return

    def get_root(self):
        return

    def get_term(self, class_id):
        return

    def get_children(self, class_id):
        return

    def get_parent(self, class_id):
        return

    def get_descendants(self, class_id, include_ancestor_label=True):
        return

    def format_entry(self, entry_data):
        return {
            "unique_values": entry_data[self.label_field],
            "class_id": entry_data[self.id_field],
            "leaf": self.leaf_func(entry_data),
        }

    def create_rslts(self, response):
        return


class BioPortalApiOntologyHandler(BaseOntologyApiHandler):
    def __init__(self, api_source, ontology_name):
        super().__init__(api_source, ontology_name)
        self.api_key = "2efd869c-5910-4852-92a4-646a01cd43af"
        self.root_id = "http://purl.obolibrary.org/obo/HP_0000001"
        self.label_field = "prefLabel"
        self.id_field = "@id"
        self.leaf_func = lambda x: len(x["children"]) if "children" in x else 0
        self.clean_func = lambda input_string: input_string.replace("/", "%2F").replace(":", "%3A")

    def get_root(self):
        return self.get_children(self.prepare_class_id_string(self.root_id))

    def get_term(self, class_id):
        rslt = requests.get(
            "{}/ontologies/{}/classes/{}?apikey={}&include=children,prefLabel".format(
                self.api_source, self.ontology_name, self.clean_func(class_id), self.api_key
            )
        )
        return self.format_entry(json.loads(rslt.content))

    def get_children(self, class_id):
        rslt = requests.get(
            "{}/ontologies/{}/classes/{}/children?apikey={}&include=children,prefLabel".format(
                self.api_source, self.ontology_name, class_id, self.api_key
            )
        )
        return self.create_rslts(rslt)

    def get_parent(self, class_id):
        parent_rslt = requests.get(
            "{}/ontologies/{}/classes/{}/parents?apikey={}".format(
                self.api_source, self.ontology_name, class_id, self.api_key
            )
        )
        parent_data = json.loads(parent_rslt.content)
        if len(parent_data) > 0:
            parent_id = parent_data[0][self.id_field]
            return [self.get_children(self.prepare_class_id_string(parent_id)), parent_id]
        else:
            parent_id = ""
            return [self.get_root(), parent_id]

    def get_descendants(self, class_id, include_ancestor_label=True):
        label = None
        cleaned_id = self.prepare_class_id_string(class_id)
        if include_ancestor_label:
            rslt = requests.get(
                "{}/ontologies/{}/classes/{}?apikey={}&include=prefLabel".format(
                    self.api_source, self.ontology_name, cleaned_id, self.api_key
                )
            )
            anc = json.loads(rslt.content)
            label = anc[self.label_field]
        call_str = "{}/ontologies/{}/classes/{}/descendants?apikey={}&pagesize=-1".format(
            self.api_source,
            self.ontology_name,
            cleaned_id,
            self.api_key,
        )
        rslt = requests.get(call_str)
        children = set([])
        if rslt.content == b"[]":
            return [children, label]
        processed_results = self.create_rslts(rslt)
        for class_info in processed_results:
            children.add(class_info["class_id"])
        return [children, label]

    def create_rslts(self, response):
        ont_data = json.loads(response.content)
        results = []
        values = ont_data["collection"]
        for val in values:
            results.append(self.format_entry(val))
        return results


class EuroBioInfApiOntologyHandler(BaseOntologyApiHandler):
    def __init__(self, api_source, ontology_name):
        super().__init__(api_source, ontology_name)
        self.label_field = "label"
        self.id_field = "iri"
        self.leaf_func = lambda x: 1 if x["has_children"] else 0
        self.clean_func = (
            lambda input_string: input_string.replace(":", "%253A")
            .replace("/", "%252F")
            .replace("%2F", "%252F")
            .replace("%3A", "%253A")
        )
        self.children_string = "{}/ols4/api/ontologies/{}/terms/{}/children"

    def get_root(self):
        rslt = requests.get("{}/ols4/api/ontologies/{}/terms/roots".format(self.api_source, self.ontology_name))
        return self.create_rslts(rslt)

    def get_term(self, class_id, count_desc=False):
        rslt = requests.get(
            "{}/ols4/api/ontologies/{}/terms/{}".format(self.api_source, self.ontology_name, self.clean_func(class_id))
        )
        if count_desc:
            skip_vals = self.get_descendants(class_id, include_ancestor_label=False)
            return [self.format_entry(json.loads(rslt.content)), skip_vals]
        return self.format_entry(json.loads(rslt.content))

    def get_children(self, class_id):
        rslt = requests.get(
            "{}/ols4/api/ontologies/{}/terms/{}/children".format(self.api_source, self.ontology_name, class_id)
        )
        return self.create_rslts(rslt)

    def get_parent(self, class_id):
        parent_rslt = requests.get(
            "{}/ols4/api/ontologies/{}/terms/{}/parents".format(self.api_source, self.ontology_name, class_id)
        )
        parent_data = json.loads(parent_rslt.content)
        if "_embedded" in parent_data:
            parent_id = parent_data["_embedded"]["terms"][0][self.id_field]
            return [self.get_children(self.prepare_class_id_string(parent_id)), parent_id]
        else:
            parent_id = ""
            return [self.get_root(), parent_id]

    def get_descendants(self, class_id, include_ancestor_label=True):
        label = None
        cleaned_id = self.prepare_class_id_string(class_id)
        if include_ancestor_label:
            rslt = requests.get(
                "{}/ols4/api/ontologies/{}/terms/{}/".format(self.api_source, self.ontology_name, cleaned_id)
            )
            anc = json.loads(rslt.content)
            label = anc[self.label_field]

        call_str = "{}/ols4/api/ontologies/{}/terms/{}/descendants?size=500".format(
            self.api_source, self.ontology_name, cleaned_id
        )
        rslt = requests.get(call_str)
        children = set([])
        processed_results = self.create_rslts(rslt)
        for class_info in processed_results:
            children.add(class_info["class_id"])
        return [children, label]

    def create_rslts(self, response):
        ont_data = json.loads(response.content)
        results = []
        if "_embedded" in ont_data:
            values = ont_data["_embedded"]["terms"]
            for val in values:
                results.append(self.format_entry(val))
        return results
