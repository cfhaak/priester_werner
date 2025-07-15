<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns="http://www.w3.org/1999/xhtml"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:tei="http://www.tei-c.org/ns/1.0"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    xmlns:local="http://dse-static.foo.bar" version="2.0" exclude-result-prefixes="xsl tei xs local">
    <xsl:output encoding="UTF-8" media-type="text/html" method="html" version="5.0" indent="yes" omit-xml-declaration="yes" />

    <xsl:import href="./partials/html_head.xsl" />
    <xsl:import href="./partials/html_navbar.xsl" />
    <xsl:import href="./partials/html_footer.xsl" />
    <xsl:import href="./partials/one_time_alert.xsl" />

    <xsl:template match="/">
        <xsl:variable name="doc_title">
            <xsl:value-of select='"Fassungsvergleich"' />
        </xsl:variable>
        <html lang="{$default_lang}">
            <head>
                <xsl:call-template name="html_head">
                    <xsl:with-param name="html_title" select="$doc_title"></xsl:with-param>
                </xsl:call-template>
                <link rel="stylesheet" href="css/edition_style.css"/>
                <script type="module" src="js/edition.js"/>
            </head>
            <body>
                <xsl:call-template name="nav_bar" />
                <main>
                    <div class="container">
                        <xsl:call-template name="one_time_alert" />
                        <h1>
                            <xsl:value-of select="$project_short_title" />
                        </h1>
                        <h2>
                            <xsl:value-of select="$project_title" />
                        </h2>
                    </div>
                    <div class="witness_view_controls_wrapper">
                        <div class="witness_view_controls_toggle">Menu</div>
                        <div class="witness_view_controls">
                            <div id="column-adder"></div>
                            <div id="scroll-toggler"></div>
                            <div id="empty-line-toggler"></div>
                            <div id="global-linenr-toggler"></div>
                            <div id="local-linenr-toggler"></div>
                        </div>
                    </div>
                    <div id="witness-container"></div>
                </main>
                <xsl:call-template name="html_footer" />
            </body>
        </html>
    </xsl:template>
</xsl:stylesheet>