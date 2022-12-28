# Changelog
# v1.0.18
- Added context menu items.
- Fixed the behaviors of keyboard shortcuts around hidden columns and BLOB columns.
- Changed the BLOB editor to use file pickers to select filepaths instead of a textarea.
- Fixed a bug that caused the switches for the data types in the INSERT editor to be ignored in the resulting SQL query.

# v1.0.17
- Fixed a bug where the terminal opened by the Tools button would not reopen after being closed.

# v1.0.16
- Added an integration with sqlite-utils, which can be accessed via the Tools button.
- Fixed an issue where [SQLite's temporary files](https://www.sqlite.org/tempfiles.html) were not being deleted after the editor was closed, due to the connection to the database not being closed properly.
- Fixed an issue where auto-reloading was not functioning for databases that had WAL mode enabled.

# v1.0.15
- Reduced the minimum required version of SQLite bundled with Python from 3.37.0 to 3.8.7.1 by adding fallback code for `PRAGMA table_list`.

# v1.0.14
- Fixed #2: Added a check for minimum supported version of the SQLite bundled with Python.
- Fixed an issue where Python binaries installed from Microsoft Store is not recognized.

# v1.0.13
- Fixed an issue where certain characters were difficult to read in the dark theme.
- Added support for high-contrast-light themes.
- Fixed the code for the error handling of spawning Python.
- Fixed an issue where the animation triggered by clicks was not playing on slow machines due to a timing issue.

# v1.0.12
- Added a dark theme.

# v1.0.11
- Added the ability to hide columns.
- Added context menus to the table header and row numbers.
- Fixed an issue where the editor state was reset without prompting the user when using an editor other than UPDATE and clicking the right side of the table.
- Added an error handling code to display error messages when the Python binary specified in the settings.json does not exist.
- Added `ORDER BY rowid` to SELECT queries.

# v1.0.10
- Fixed a bug that caused the default table height to be set to 200 instead of 20.

# v1.0.9
- Fixed an issue of stuttering when changing the table's height.
- Fixed a bug where the input box in a cell would not respond to clicks.

# v1.0.8
- Added code to display runtime errors raised by Python.

# v1.0.7
- Fixed runtime errors in Python versions lower than 3.8.3.

# v1.0.6
- The extension now displays blank rows when there are few records, and switches to the INSERT editor when one of the cells is clicked.
- The "Commit changes?" dialog is now displayed for the INSERT, CREATE TABLE, CREATE INDEX, and custom query editor, as well as the UPDATE editor.
- Tooltips on icon buttons are now displayed immediately when hovered to improve accessibility.

# v1.0.5
- Fixed a bug where columns could not be resized while updating a cell.
- Added a cancel button to the "Commit changes?" dialog and made it focus the "Commit" button when opened.
- Fixed the behaviors of the Enter and Tab keys while updating a cell.
- Added LICENSE (MIT) and `vendor.LICENSE.txt`.

# v1.0.4
- Fixed a problem where undo/redo were not working on inputs.

# v1.0.3
- Fixed #1: *.sqlite and *.sqlite3 are now recognized as SQLite databases.

# v1.0.2
- Fixed a bug introduced in v1.0.1.

# v1.0.1
- Added keyboard shortcuts to move selection.
