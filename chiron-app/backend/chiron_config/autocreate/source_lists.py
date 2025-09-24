from chiron.data_dictionary.csv_autocreate import CsvFileAutocreate


patient_source_list = {
    "autocreate_tool": CsvFileAutocreate,
    "defaults": {
        "dataset": "default_1",
    },
    "list": [
        {
            "unique_source_id": "demographics",
            "filename": "test/patients.csv",
            "load_to_root": True,
            "subject_id_field": "Id",
            "category": "demographics",
        },
        {
            "unique_source_id": "encounters",
            "filename": "test/encounters.csv",
            "subject_id_field": "PATIENT",
            "collection_id_field": "Id",
        },
        {
            "unique_source_id": "labs",
            "filename": "test/observations.csv",
            "subject_id_field": "PATIENT",
        },
        {
            "unique_source_id": "conditions",
            "filename": "test/conditions.csv",
            "subject_id_field": "PATIENT",
        },
        {
            "unique_source_id": "procedures",
            "filename": "test/procedures.csv",
            "subject_id_field": "PATIENT",
        },
        {
            "unique_source_id": "medications",
            "filename": "test/medications.csv",
            "subject_id_field": "PATIENT",
        },
    ],
}
