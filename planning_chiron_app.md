# How source code is retrieved

**the backend**
- source is stored here in `backend/`
- ☝️Keep in mind not just the Chiron app, it's a Django project that includes the Chiron app. Chiron is implemented as a Django app and can't be run by itself.
- This source code originated from one of our Chiron systems (maybe my chiron-demo? Ezra's?)
- ... but Trang made so many adjustments that it is basically a custom repo by now.
- We will continue to make changes to allow datasets to be swapped between Chiron systems more easily. Currently the dataset backup/restore functionality only handles the data dictionary. It doesn't handle or even validate for custom processors, optional dependencies, different Chiron versions, etc.
- ... which means...
- ☝️The `backend/` Django project will continue to be modified as Chiron functionality is improved.

**chiron**
- set in the `backend/Dockerfile`
- as a pip import command with GitHub URL and commit/branch/version

**ontology-app**
- set in the `backend/Dockerfile`
- as a pip import command with GitHub URL and commit/branch/version
- We might want to make this feature optional.

**new UI**
- source is stored here in `frontend/`
- I think we should somehow use the GitHub repo itself, and remove the source code from here.

**redcap_importer?**
- Currently not incorporating the redcap_importer tool
- Similar to ontology-app, this is a separate Django app that is often used together with Chiron.

# Repo structural changes
- Put Trang's "chiron app" system in its own repo named "chiron-deployment"
- chiron-admin-collab repo will be used for communication and documentation
- (future) chiron-deployment will eventually replace all the utility chiron Django projects:
	- chiron-demo repo (mine)
	- chiron-demo repo (Ezra's)
	- test_project in the Chiron repo
	- performance_project in the Chiron repo
