# Chiron DEMO API

This is used to power the work on the Chiron UI.

## Requirements

- Docker

## Local Environment Startup

- Copy .env.sample to .env
- Update .env to the correct DB settings (if using localhost you need to use your IP address as localhost in docker is not the same)
- Start up the app: `docker composer -f docker-compose.yml up`
  - If you have an empy database, you can run the following commands to connect and initialize the database
    - `docker compose exec api /bin/bash`
    - `./manage.py restore_project_state`
    - `./manage.py chiron_run_etl`
    - `exit`
- The app is hosted at http://localhost:13001

## Local Development

- Same setup applies from the local environment startup
- to start the app for changes run the following:
  - `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
  - This will start up the app with an inline postgres instance to initialize and work with
  - The database is exposed to port 54322
  - The app is hosted at http://localhost:8000
  - To reset the session start a shell `python manage.py shell`, import the session object and clear` from django.contrib.sessions.models import Session; Session.objects.all().delete();`

## Updating the Chiron DD

- Same setup applies from the local environment startup
- To backup the dd run the following:
  - `docker compose -f docker-compose.yml -f docker-compose.dbdump.yml run --rm api python manage.py chiron_backup_dd`
  - You can also run on off commands with this command as well.
  - The docker-compose.dbdump.yml just maps the code into the docker image to write to
