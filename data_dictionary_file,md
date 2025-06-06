# Data Dictionary File Instructions

A Chiron data admin has access to export the data dictionary for an entire dataset as a CSV file.

The main purpose of this CSV file is to make common editing tasks easier for non-technical users. After being exported by the data admin, the file can be given to anyone (along with these instructions) to make modifications. Once modifications are complete, the file can be returned to the data admin. The data admin can review if needed, then use the CSV Import option to apply all changes from the CSV into the actual system data dictionary.

## How to edit the data dictionary file

### General Rules

Do not add rows.
- The file cannot be used to create new concepts, only modify existing ones.

Removing entire rows WILL NOT remove concepts from the system.
- If you want to delete concepts from the system, you should keep the rows in this file and use the DELETE_TRUE_FALSE or PUBLISH_TRUE_FALSE column.

However, you can remove any rows from the file that you're not interested in editing.
- This is entirely optional, but may make the CSV easier to work with if you know you are only interested in editing a specific subset.
- When the CSV changes are applied in the system, any rows not referenced in the CSV will be left as-is.

The row sort order doesn't matter.
- If it is helpful, you can resort the row order as needed.
- It will not affect anything in the actual system data dictionary. Actual sorting is based on the "ORDERING" value, usually in addition to grouping by Category.

### List of Columns

DO_NOT_EDIT_CONCEPT_ID
- This is the internal system ID for the concept. It is not typically displayed to users.
- Required by the system to identify this concept - cannot be edited.

DO_NOT_EDIT_SOURCE
- Information about the source database/table/field used to populate this concept
- For reference only - cannot be edited.

DO_NOT_EDIT_COLLECTION
- In the Chiron database, concepts are grouped into different collections that can have different cardinality.
- For reference only - cannot be edited.


CATEGORY_1, CATEGORY_2, ..., CATEGORY_N
- Concepts can be grouped into a hierarchy of categories. This hierarchy is used to make the concept collection easier to browse on the website.
- Note that the only role of categories is for displaying and organizing the list of concepts. Categories have no impact on how data is actually stored or queried, they are purely cosmetic.
- CATEGORY columns from left to right correspond to the hierarchy going from top to bottom.
- Concepts can be associated with any category in the hierarchy at any level, or no category at all.
	- If you want a concept at the very top level with no category, leave all the category columns blank.
	- If you want a concept one level down, specify the parent category name in CATEGORY_1 and leave the remaining CATEGORY columns blank.
		- Then for a concept two levels down, will have category names in CATEGORY_1 and CATEGORY_2 only.
		- ...And so on.
	- If you need more hierarchy levels than the number of CATEGORY columns you have, you can add more CATEGORY_N columns following the same pattern.

ORDERING
- All concepts within the same category will be sorted from lowest order value to highest.
- They don't have to be an exact sequence like 1, 2, 3, etc. And you can even use decimals. So a perfectly acceptable sequence is 5, 20, 20.01, 20.7, 21, 44.

DISPLAY_NAME
- The human-readable name of this concept.

DISPLAY_NAME_PLURAL
- If no value, will add "s" to the end of the DISPLAY_NAME.

DATATYPE
- This can be modified, but it has to make sense for the source data. The basic data types are:
	- Date
	- Float
	- Integer
	- Boolean
	- Category
		- Good for concepts that only have a few unique values that repeat.
		- It displays every unique value on a single view, so if there are too many it's better to use TextHandler.
	- Text
		- Good for non-repetitive text values like IDs or free-text user input.
		- It cannot handle long (multi-sentence) values well. We currently don't support very long text values like notes.

PUBLISH_TRUE_FALSE
- The difference between deleting and unpublishing:
	- When you delete a concept, the concept definition is completely removed from the data dictionary.
	- If you unpublish a concept instead, the concept definition stays in the data dictionary, but from the point of view of the system it doesn't exist. It won't be included when source data is loaded into Chiron, and it won't appear anywhere on the website.
	- The reason to unpublish vs delete: Unpublishing takes the concept out of the system without removing the metadata about it from the data dictionary. This can be convenient if you are considering adding it back to the website at a future date.

DELETE_TRUE_FALSE
- This concept and all its data will be permanently removed from both the data dictionary and the system.
- For a less permanent approach, see PUBLISH_TRUE_FALSE.

IS_PHI_TRUE_FALSE
- Set to "True" if this concept can contain PHI.
- Users have an "access level" for a dataset. If a user doesn't have an access level that allows them to view PHI, they will not be able to view this concept.

DESCRIPTION
- This is displayed in the query view along with statistics and summary information about the data.
- The value can be multi-line and has support for HTML markup.

COMMENTS_FOR_CUSTOM_NEEDS
- This CSV gives access to a lot of basic and standard options for customizing the data dictionary.
- But it doesn't cover all situations. Almost anything can be changed about how source data is cleaned, organized, labeled, and presented on the website.
- This column is included as a convenience for helping track changes that will have to be applied manually. The system will ignore anything written here.
