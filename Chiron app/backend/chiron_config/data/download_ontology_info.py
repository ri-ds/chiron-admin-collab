import pandas as pd
import requests
import json


# Utility script to download full ontology from the ebi api.
# Need to write this for BioPortal
# change this to the id of the ontology to download
ONTOLOGY = "bco"

ont_terms = []

next = True
rsp = requests.get("https://www.ebi.ac.uk/ols4/api/ontologies/{}/terms".format(ONTOLOGY))

kept_columns = {
    "iri": "",
    "description": "",
    "synonyms": "",
    "annotation": "",
    "label": "",
    "has_children": "",
    "is_root": "",
}


def keep_clean(term):
    keys = list(term.keys())
    for k in keys:
        if k not in kept_columns:
            term.pop(k, None)
    return term


while next:
    data = json.loads(rsp.content)

    for term in data["_embedded"]["terms"]:
        ont_terms.append(keep_clean(term))

    if "next" in data["_links"]:
        rsp = requests.get(data["_links"]["next"]["href"])
    else:
        next = False

df = pd.DataFrame(ont_terms)
df.to_csv("data/{}.csv".format(ONTOLOGY))
