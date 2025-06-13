#!/bin/bash

python manage.py restore_project_state
python manage.py chiron_restore_dataset --overwrite dataset2_stored.json
python manage.py chiron_run_etl <<< "all" &
python manage.py runserver 8000
