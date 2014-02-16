es-arcadecrawler
================

A quickly assembled mameDB crawler for EmulationStation Arcade gamelist.xml

Will try to read all arcade games from a directory and grab their data from MameDB.

Grabbed data will be stored into a local sqlite DB for later use.

All files need their original name for the lookup.

Install:
--------

`npm install`


Usage:
------

`node index.js /path/to/roms/ [truncate]`

use the optional truncate flag to truncate DB first.