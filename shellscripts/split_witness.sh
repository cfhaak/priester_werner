#!/bin/bash
java -cp saxon/saxon9he.jar net.sf.saxon.Transform -s:./data/source/heinrich/DAH_Edition_TEI.xml -xsl:./xslt/extract-all-witnesses.xsl