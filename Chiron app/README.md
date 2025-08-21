# Chiron Admin Collab

A Dockerized deployment of the IS4R-Chiron platform with an updated UI. This application streamlines data management and analysis for IS4R research workflows with integrated medical ontology support.

> ⚠️ **Note:** You must have access to the `cchmc` GitHub organization and the private `is4r-chiron` repositories.

---

## 🖼️ UI Preview

![Chiron UI Screenshot](./docs/chiron-ui-screenshot.png)
<sub>*Chiron Admin Dashboard — example interface*</sub>

---

## 🚀 Quick Start

Follow the steps below to get the platform running locally using Docker.

### 1. 📥 Clone Repository
```bash
git clone https://github.com/cchmc/is4r-chiron.git
cd "Chiron app"
```

### 2. 🔑 Generate a GitHub Personal Access Token

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/personal-access-tokens)

![Chiron UI Screenshot](./docs/Github_setup_1.png)

2. Under **Resource owner**, select **`cchmc`**

![Chiron UI Screenshot](./docs/Github_setup_2.png)

3. Name your token, provide an expiration date
4. For repository access, choose:
   - **All repositories**, or
   - **Only select repositories** → Include `cchmc/is4r-chiron` and `cchmc/is4r-chiron-ontology`
5. Under **Permissions**, enable:
   - `Contents` → **Read-only**
   - `Secrets` → **Read-only**
6. Generate and copy the token

### 3. ⚙️ Configure the `.env` File

In the root of the `chiron-admin-collab` directory, create a `.env` file:

```env
CHIRON_AUTH=your_generated_token_here
```

This token allows the Docker build to access the private Chiron repository.

### 4. 🐳 Start containers and initialize the app (run in order)

```bash
BUILD_NUMBER=1 docker-compose up -d
BUILD_NUMBER=1 docker-compose exec api python manage.py migrate
BUILD_NUMBER=1 docker-compose exec api python manage.py chiron_restore_dd
BUILD_NUMBER=1 docker-compose exec api python manage.py chiron_restore_dataset dataset3_stored.json
BUILD_NUMBER=1 docker-compose exec api python manage.py chiron_autocreate_dd
BUILD_NUMBER=1 docker-compose exec api python manage.py ontology_load --o chiron_config/data/source_data/ontology_source/fyler_test.json
BUILD_NUMBER=1 docker-compose exec api python manage.py chiron_run_etl
BUILD_NUMBER=1 docker-compose exec api python manage.py createsuperuser

# (optional, if prompted later or schema updates occur)
BUILD_NUMBER=1 docker-compose exec api python manage.py makemigrations
BUILD_NUMBER=1 docker-compose exec api python manage.py migrate
```

### 5. 👥 Configure User Access

After completing the initialization:

1. **Access Admin Panel**: Go to http://localhost:13001/admin/
2. **Log in** with the superuser credentials you created
3. **Create Chiron User**: 
   - Navigate to "Chiron users" section
   - Click "Add chiron user"
   - Link your Django superuser to a new Chiron user
   - **Grant dataset access** to the datasets of interest

> 📋 **Important**: The superuser must be added as a Chiron user and granted dataset permissions to access the research data interface.

---

## 🧬 Ontology Support

This platform includes medical ontology integration for standardized terminology:

- **Fyler Ontology**: terminology system loaded via `fyler_test.json` ~ WIP

---

## 📊 Testing Datasets

### Datasets that load from fixture with `initialize_dd()`:

- **`dataset2_stored`** *(ontology-enabled)*
  - Used to test autocreate and ETL from CSV files (subject matching, etc.)
  - Used in combination with default to test multi-dataset systems handling dataset permissions
  - Used to test complex subject matching
  - Used to test some custom ETL processors like detailed age, deid id

---

## 🌐 Access the Application

* **Admin Interface**: [http://localhost:13001/admin/](http://localhost:13001/admin/)
  → Use the superuser credentials you just created.

* **Chiron UI**: [http://localhost:13000](http://localhost:13000)

---

## 📁 Project Structure

```
chiron-admin-collab/
├── .env
├── docker-compose.yml
├── src/
│   ├── ui/
│   └── backend/
├── docs/
│   └── chiron-ui-screenshot.png
└── README.md
```

---

## 📝 License & Access

This project is internal to the CCHMC organization and not intended for public use. For access, usage, or licensing questions, contact the project administrator.
