# SQLite3 Editor
Edit SQLite3 files like you would in Excel.

**IMPORTANT**: This extension requires **Python >=3.6** compiled with SQLite >=3.8.7.1 (2014-10-29).

This extension uses the `sqlite3` module in the standard library of Python to query sqlite3 databases. It searches through the PATH for a Python 3 binary, but if it can't find one or the wrong version of Python is selected, you can specify the filepath of a python binary in the config `sqlite3-editor.pythonPath`.

## Screenshot
![](https://raw.githubusercontent.com/yy0931/sqlite3-editor/main/screenshot.png)

## Features
- **Supported statements**: ALTER TABLE, CREATE TABLE, DELETE, DROP TABLE, DROP VIEW, INSERT, UPDATE, CREATE INDEX, DROP INDEX, and custom queries.
- **Click a cell and UPDATE in-place** with an intuitive GUI.
- **Find widget** to filter records with **regex**, **whole word**, and **case-sensitivity** switches.
- **Efficiently** edit large tables by **only querying the visible area**.
- **Auto-reload** when the table is modified by another process.

# Usage
This extension recognizes `.db`, `.sqlite`, and `.sqlite3` files as Sqlite3 databases. To open other files, add the following settings to your [user or workspace settings.json](https://code.visualstudio.com/docs/getstarted/settings):

```json
// Associates *.ext to the SQLite3 editor
"workbench.editorAssociations": {
    "*.ext": "sqlite3-editor.editor"
},
```

# Limitations
- If using **SQLite <3.37.0 (2021-11-27)**, databases with [STRICT tables](https://www.sqlite.org/stricttables.html) cannot be read, as these versions of SQLite do not support it.
- If using **SQLite <3.22.0 (2018-01-22)**, [WAL-mode databases cannot be read](https://www.sqlite.org/wal.html#read_only_databases), because the extension uses read-only connections for SELECT statements to prevent accidental overwrites.
- If using **SQLite <3.16.0 (2017-01-02)**, `Check Journal Mode` under `Other Tools` doesn't work as these versions of SQLite [don't support](https://www.sqlite.org/changes.html#version_3_16_0) PRAGMA functions.

> You can check the version of SQLite that a Python binary has with the following command.
> ```shell
> python3 -c "import sqlite3; print(sqlite3.sqlite_version)"
> ```
