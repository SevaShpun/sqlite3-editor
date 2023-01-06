# SQLite3 Editor
This extension lets you edit SQLite files without having to write SQL queries, a feature not currently offered by any other extensions.

**IMPORTANT**: This extension requires **Python >=3.6** compiled with SQLite >=3.37.0 (fully supported) or >=3.8.8 (partially supported). The extension will tell you if the requirements are not met.

![](https://raw.githubusercontent.com/yy0931/sqlite3-editor/main/demo.gif)

## Contents
- [Features](#features)
- [File Associations](#file-associations)

## Features
- **Click a cell and UPDATE in-place** with an intuitive GUI.
- **The find widget** to filter records with **regex**, **whole word**, and **case-sensitivity** switches.
- **Efficiently** edit large tables by **only querying the visible area**.
- **Auto-reload** when the table is modified by another process.
- **Other statements supported**: ALTER TABLE, CREATE TABLE, DELETE, DROP TABLE, DROP VIEW, INSERT, UPDATE, CREATE INDEX, DROP INDEX, and custom queries.

## File Associations
This extension recognizes `.db`, `.sqlite`, `.sqlite3`, and `.duckdb` files as database files. To open other files, right click the file in the explorer and select `Open with…` then `SQLite3 Editor`.

![](https://raw.githubusercontent.com/yy0931/sqlite3-editor/main/open_with.gif)
 