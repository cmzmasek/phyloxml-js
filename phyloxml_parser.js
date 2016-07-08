/**
 *  Copyright (C) 2016 Christian M. Zmasek
 *  Copyright (C) 2016 J. Craig Venter Institute
 *  All rights reserved
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation; either
 *  version 2.1 of the License, or (at your option) any later version.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this library; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA
 *
 *  Created by czmasek on 7/7/2016.
 */


/**
 * This requires sax-js from https://github.com/isaacs/sax-js
 * 
 * Usage:
 * 
 * Synchronous parsing of phyloXML-formatted string:
 * 
 * var phyloxml_parser = require('./phyloxml_parser');
 * var p = phyloxml_parser.phyloXmlParser;
 * 
 * var phys = p.parse(phyloxml_text, {trim: true, normalize: true});
 * 
 * 
 * Asynchronous parsing of phyloXML-formatted stream:
 * 
 * var fs = require('fs');
 * var phyloxml_parser = require('./phyloxml_parser');
 * var p = phyloxml_parser.phyloXmlParser;
 * 
 * var stream = fs.createReadStream(xmlfile, {encoding: 'utf8'});
 * 
 * p.parseAsync(stream, {trim: true, normalize: true});
 * 
 */
(function phyloXmlParser() {

    "use strict";

    var sax = null;
    if (typeof module !== 'undefined' && module.exports && !global.xmldocAssumeBrowser) {
        // Being used in a Node-like environment
        sax = require('./lib/sax');
    }
    else {
        // Attached to the Window object in a browser
        sax = this.sax;
        if (!sax) {
            throw new Error("Expected sax to be defined. Make sure you are including sax.js before this file.");
        }
    }
    
    // --------------------------------------------------------------
    // phyloXML constants
    // --------------------------------------------------------------
    const PHYLOGENY = 'phylogeny';
    
    // Id
    const ID = 'id';
    const ID_PROVIDER_ATTR = 'provider';

    // Accession
    const ACCESSION = 'accession';
    const ACCESSION_SOURCE_ATTR = 'source';
    const ACCESSION_COMMENT_ATTR = 'comment';

    // Annotation
    const ANNOTATION = 'annotation';
    const ANNOTATION_REF_ATTR = 'ref';
    const ANNOTATION_SOURCE_ATTR = 'source';
    const ANNOTATION_EVIDENCE_ATTR = 'evidence';
    const ANNOTATION_TYPE_ATTR = 'type';
    const ANNOTATION_DESC = 'desc';
    const ANNOTATION_CONFIDENCE = 'confidence';
    const ANNOTATION_PROPERTIES = 'property';
    const ANNOTATION_URI = 'uri';

    // Clade
    const CLADE = 'clade';
    const CLADE_ID_SOURCE_ATTR = 'id_source';
    const CLADE_NAME = 'name';
    const CLADE_BRANCH_LENGTH = 'branch_length';
    const CLADE_WIDTH = 'width';
    const CLADE_EVENTS = 'events';
    const CLADE_DISTRIBUTION = 'distribution';

    // Color
    const COLOR = 'color';
    const COLOR_RED = 'red';
    const COLOR_GREEN = 'green';
    const COLOR_BLUE = 'blue';

    // Confidence
    const CONFIDENCE = 'confidence';
    const CONFIDENCE_TYPE_ATTR = 'type';
    const CONFIDENCE_STDDEV_ATTR = 'stddev';

    // Cross References
    const CROSS_REFERENCES = 'cross_references';

    // Date
    const DATE = 'date';
    const DATE_UNIT_ATTR = 'unit';
    const DATE_DESC = 'desc';
    const DATE_VALUE = 'value';
    const DATE_MINIMUM = 'minimum';
    const DATE_MAXIMUM = 'maximum';

    // Distribution
    const DISTRIBUTION = 'distribution';
    const DISTRIBUTION_DESC = 'desc';
    //const DISTRIBUTION_POINT = 'point';
    //const DISTRIBUTION_POLYGON = 'polygon';

    // Domain Architecture
    const DOMAIN_ARCHITECTURE = 'domain_architecture';
    const DOMAIN_ARCHITECTURE_DOMAIN = 'domain';
    const DOMAIN_ARCHITECTURE_LENGTH_ATTR = 'length';

    // Events
    const EVENTS = 'events';
    const EVENTS_TYPE = 'type';
    const EVENTS_DUPLICATIONS = 'duplications';
    const EVENTS_SPECIATIONs = 'speciations';
    const EVENTS_LOSSES = 'losses';
    const EVENTS_CONFIDENCE = 'confidence';

    // Mol Seq
    const MOLSEQ = 'mol_seq';
    const MOLSEQ_IS_ALIGNED_ATTR = 'is_aligned';

    // Property
    const PROPERTY = 'property';
    const PROPERTY_REF_ATTR = 'ref';
    const PROPERTY_ID_REF_ATTR = 'id_ref';
    const PROPERTY_UNIT_ATTR = 'unit';
    const PROPERTY_DATATYPE_ATTR = 'datatype';
    const PROPERTY_APPLIES_TO_ATTR = 'applies_to';

    // Protein Domain
    const PROTEINDOMAIN = 'domain';
    const PROTEINDOMAIN_FROM_ATTR = 'from';
    const PROTEINDOMAIN_TO_ATTR = 'to';
    const PROTEINDOMAIN_CONFIDENCE_ATTR = 'confidence';
    const PROTEINDOMAIN_ID_ATTR = 'id';

    // Reference
    const REFERENCE = 'reference';
    const REFERENCE_DOI_ATTR = 'doi';
    const REFERENCE_DESC = 'desc';

    // Sequence
    const SEQUENCE = 'sequence';
    const SEQUENCE_ID_SOURCE_ATTR = 'id_source';
    const SEQUENCE_ID_REF_ATTR = 'id_ref';
    const SEQUENCE_TYPE_ATTR = 'type';
    const SEQUENCE_SYMBOL = 'symbol';
    const SEQUENCE_ACCESSION = 'accession';
    const SEQUENCE_NAME = 'name';
    const SEQUENCE_GENE_NAME = 'gene_name';
    const SEQUENCE_LOCATION = 'location';
    const SEQUENCE_MOL_SEQ = 'mol_seq';
    const SEQUENCE_ANNOTATION = 'annotation';
    const SEQUENCE_DOMAIN_ARCHITECTURE = 'domain_architecture';
    const SEQUENCE_URI = 'uri';
    const SEQUENCE_CROSS_REFERENCES = 'cross_references';

    // Sequence Relation
    const SEQUENCE_RELATION = 'sequence_relation';
    const SEQUENCE_RELATION_ID_REF_0_ATTR = 'id_ref_0';
    const SEQUENCE_RELATION_ID_REF_1_ATTR = 'id_ref_1';
    const SEQUENCE_RELATION_TYPE_ATTR = 'distance';
    const SEQUENCE_RELATION_DISTANCE_ATTR = 'distance';

    // Taxonomy
    const TAXONOMY = 'taxonomy';
    const TAXONOMY_CODE = 'code';
    const TAXONOMY_SCIENTIFIC_NAME = 'scientific_name';
    const TAXONOMY_AUTHORITY = 'authority';
    const TAXONOMY_COMMON_NAME = 'common_name';
    const TAXONOMY_SYNONYM = 'synonym';
    const TAXONOMY_RANK = 'rank';
    const TAXONOMY_URI = 'uri';

    // Uri
    const URI = 'uri';
    const URI_TYPE_ATTR = 'type';
    const URI_DESC_ATTR = 'desc';

    // Binary Characters (not implemented)
    const BINARY_CHARACTERS = 'binary_characters';
    const BINARY_CHARACTERS_TYPE_ATTR = 'type';
    const BINARY_CHARACTERS_GAINED_COUNT_ATTR = 'gained_count';
    const BINARY_CHARACTERS_LOST_COUNT_ATTR = 'lost_count';
    const BINARY_CHARACTERS_PRESENT_COUNT_ATTR = 'present_count';
    const BINARY_CHARACTERS_ABSENT_COUNT_ATTR = 'absent_count';
    const BINARY_CHARACTERS_GAINED = 'gained';
    const BINARY_CHARACTERS_LOST = 'lost';
    const BINARY_CHARACTERS_PRESENT = 'present';
    const BINARY_CHARACTERS_ABSENT = 'absent';

    // --------------------------------------------------------------
    // Instance variables
    // --------------------------------------------------------------
    var _phylogenies = null;
    var _phylogeny = null;
    var _cladeStack = null;
    var _tagStack = null;
    var _objectStack = null;

    // --------------------------------------------------------------
    // Functions for object creation
    // --------------------------------------------------------------
    function newAccession(tag) {
        var acc = {};
        acc.value = null;
        acc.source = getAttribute(ACCESSION_SOURCE_ATTR, tag.attributes);
        acc.comment = getAttribute(ACCESSION_COMMENT_ATTR, tag.attributes);
        getCurrentObject().accession = acc;
        _objectStack.push(acc);
    }

    //TODO
    function newAnnotation(tag) {
        var ann = {};
        ann.evidence = getAttribute(ANNOTATION_EVIDENCE_ATTR, tag.attributes);
        ann.ref = getAttribute(ANNOTATION_REF_ATTR, tag.attributes);
        ann.source = getAttribute(ANNOTATION_SOURCE_ATTR, tag.attributes);
        ann.type = getAttribute(ANNOTATION_TYPE_ATTR, tag.attributes);
        addToArrayInCurrentObject('annotations', ann);
        _objectStack.push(ann);
    }

    function newClade(tag) {
        var newClade = {};
        if (CLADE_BRANCH_LENGTH in tag.attributes) {
            newClade.branch_length = parseFloat(tag.attributes[CLADE_BRANCH_LENGTH]);
        }
        if (CLADE_ID_SOURCE_ATTR in tag.attributes) {
            //TODO not implemented yet
            newClade.id_source = tag.attributes[CLADE_ID_SOURCE_ATTR];
        }
        if (_phylogeny == null) {
            _phylogeny = newClade;
        }
        else {
            var currClade = getCurrentClade();
            if (currClade.clades == undefined) {
                currClade.clades = [newClade];
            }
            else {
                currClade.clades.push(newClade);
            }
        }
        _cladeStack.push(newClade);
        _objectStack.push(newClade);
    }

    //TODO
    function newColor(tag) {
        var col = {};
        col.red = null;
        col.green = null;
        col.blue = null;
        getCurrentObject().color = col;
        _objectStack.push(col);
    }

    function newConfidence(tag) {
        var conf = {};
        conf.value = null;
        conf.type = getAttribute(CONFIDENCE_TYPE_ATTR, tag.attributes);
        conf.stddev = getAttribute(CONFIDENCE_STDDEV_ATTR, tag.attributes);
        addToArrayInCurrentObject('confidences', conf);
        _objectStack.push(conf);
    }

    //TODO
    function newDate(tag) {
        var date = {};
        date.unit = getAttribute(DATE_UNIT_ATTR, tag.attributes);
        getCurrentObject().date = date;
        _objectStack.push(date);
    }

    //TODO
    function newDistribution(tag) {
        var dist = {};
        dist.desc = null;
        dist.unit = getAttribute(DATE_UNIT_ATTR, tag.attributes);
        addToArrayInCurrentObject('distributions', dist);
        _objectStack.push(dist);
    }

    //TODO
    function newDomainArchitecture(tag) {
        var da = {};
        da.domains = null;
        da.length = getAttribute(DOMAIN_ARCHITECTURE_LENGTH_ATTR, tag.attributes);
        getCurrentObject().domain_architecture = da;
    }

    //TODO
    function newEvents(tag) {
        var events = {};
        getCurrentObject().events = events;
        _objectStack.push(events);
    }

    function newId(tag) {
        var i = {};
        i.value = null;
        i.provider = getAttribute(ID_PROVIDER_ATTR, tag.attributes);
        getCurrentObject().id = i;
        _objectStack.push(i);
    }

    //TODO
    function newProperty(tag) {
        var prop = {};
        prop.ref = getAttribute(PROPERTY_REF_ATTR, tag.attributes);
        prop.unit = getAttribute(PROPERTY_UNIT_ATTR, tag.attributes);
        prop.datatype = getAttribute(PROPERTY_DATATYPE_ATTR, tag.attributes);
        prop.applies_to = getAttribute(PROPERTY_APPLIES_TO_ATTR, tag.attributes);
        prop.id_ref = getAttribute(PROPERTY_ID_REF_ATTR, tag.attributes);
        addToArrayInCurrentObject('properties', prop);
        _objectStack.push(prop);
    }

    //TODO
    function newProteinDomain(tag) {
        var pd = {};
        pd.name = null;
        pd.from = getAttribute(PROTEINDOMAIN_FROM_ATTR, tag.attributes);
        pd.to = getAttribute(PROTEINDOMAIN_TO_ATTR, tag.attributes);
        pd.confidence = getAttribute(PROTEINDOMAIN_CONFIDENCE_ATTR, tag.attributes);
        pd.id = getAttribute(PROTEINDOMAIN_ID_ATTR, tag.attributes);
        addToArrayInCurrentObject('domains', pd);
        _objectStack.push(pd);
    }

    //TODO
    function newReference(tag) {
        var reference = {};
        reference.doi = getAttribute(REFERENCE_DOI_ATTR, tag.attributes);
        addToArrayInCurrentObject('references', reference);
        _objectStack.push(reference);
    }

    function newSequence(tag) {
        var seq = {};
        seq.type = getAttribute(SEQUENCE_TYPE_ATTR, tag.attributes);
        seq.id_source = getAttribute(SEQUENCE_ID_SOURCE_ATTR, tag.attributes);
        seq.id_ref = getAttribute(SEQUENCE_ID_REF_ATTR, tag.attributes);
        addToArrayInCurrentObject('sequences', seq);
        _objectStack.push(seq);
    }

    //TODO
    function newSequenceRelation(tag) {
        var seqrel = {};
        seqrel.distance = getAttribute(SEQUENCE_RELATION_DISTANCE_ATTR, tag.attributes);
        seqrel.id_ref_0 = getAttribute(SEQUENCE_RELATION_ID_REF_0_ATTR, tag.attributes);
        seqrel.id_ref_1 = getAttribute(SEQUENCE_RELATION_ID_REF_1_ATTR, tag.attributes);
        seqrel.type = getAttribute(SEQUENCE_RELATION_TYPE_ATTR, tag.attributes);
        //TODO
        _objectStack.push(seqrel);
    }

    function newTaxonomy(tag) {
        var tax = {};
        tax.id_source = getAttribute(CLADE_ID_SOURCE_ATTR, tag.attributes);
        addToArrayInCurrentObject('taxonomies', tax);
        _objectStack.push(tax);
    }

    function newUri(tag) {
        var uri = {};
        uri.value = null;
        uri.desc = getAttribute(URI_DESC_ATTR, tag.attributes);
        uri.type = getAttribute(URI_TYPE_ATTR, tag.attributes);
        addToArrayInCurrentObject('uris', uri);
        _objectStack.push(uri);
    }

    // --------------------------------------------------------------
    // Functions for processing text
    // --------------------------------------------------------------
    function inClade(text) {
        if (getCurrentTag() == CLADE_NAME) {
            getCurrentClade().name = text;
        }
        else if (getCurrentTag() == CLADE_BRANCH_LENGTH) {
            getCurrentClade().branch_length = parseFloat(text);
        }
        else if (getCurrentTag() == CLADE_WIDTH) {
            getCurrentClade().width = parseFloat(text);
        }
    }

    function inConfidence(text) {
        getCurrentObject().value = text;
    }

    function inId(text) {
        getCurrentObject().value = text;
    }

    function inAccession(text) {
        getCurrentObject().value = text;
    }

    function inUri(text) {
        getCurrentObject().value = text;
    }

    function inTaxonomy(text) {
        if (getCurrentTag() == TAXONOMY_CODE) {
            getCurrentObject().code = text;
        }
        else if (getCurrentTag() == TAXONOMY_SCIENTIFIC_NAME) {
            getCurrentObject().scientific_name = text;
        }
        else if (getCurrentTag() == TAXONOMY_AUTHORITY) {
            getCurrentObject().authority = text;
        }
        else if (getCurrentTag() == TAXONOMY_COMMON_NAME) {
            addToArrayInCurrentObject('common_names', text);
        }
        else if (getCurrentTag() == TAXONOMY_SYNONYM) {
            addToArrayInCurrentObject('synonyms', text);
        }
        else if (getCurrentTag() == TAXONOMY_RANK) {
            getCurrentObject().rank = text;
        }
    }

    function inSequence(text) {
        if (getCurrentTag() == SEQUENCE_SYMBOL) {
            getCurrentObject().symbol = text;
        }
        else if (getCurrentTag() == SEQUENCE_NAME) {
            getCurrentObject().name = text;
        }
        else if (getCurrentTag() == SEQUENCE_GENE_NAME) {
            getCurrentObject().gene_name = text;
        }
        else if (getCurrentTag() == SEQUENCE_LOCATION) {
            getCurrentObject().location = text;
        }
    }

    // --------------------------------------------------------------
    // Functions for SAX parser
    // --------------------------------------------------------------
    function phyloxmlOnopentag(tag) {
        _tagStack.push(tag.name);
        switch (tag.name) {
            case PHYLOGENY:
                //TODO
                break;
            case CLADE:
                newClade(tag);
                break;
            case CONFIDENCE:
                newConfidence(tag);
                break;
            case ID:
                newId(tag);
                break;
            case TAXONOMY:
                newTaxonomy(tag);
                break;
            case SEQUENCE:
                newSequence(tag);
                break;
            case ACCESSION:
                newAccession(tag);
                break;
            case URI:
                newUri(tag);
                break;
            default:
        }
    }

    function phyloxmlOnclosetag(tag) {
        _tagStack.pop();
        if (tag == CLADE) {
            _cladeStack.pop();
            _objectStack.pop();
        }
        else if (tag == PHYLOGENY) {
            _phylogenies.push(_phylogeny);
            startNewPhylogeny();
        }
        else if (tag == TAXONOMY
            || tag == CONFIDENCE
            || tag == ID
            || tag == SEQUENCE
            || tag == ACCESSION
            || tag == URI) {
            _objectStack.pop();
        }
    }

    function phyloxmlOntext(text) {
        var parentTag = _tagStack.get(1);

        if (_tagStack.get(1) == CLADE) {
            inClade(text);
        }

        var currentTag = _tagStack.peek();

        if (currentTag == CONFIDENCE) {
            inConfidence(text);
        }
        else if (currentTag == ID) {
            inId(text);
        }
        else if (currentTag == ACCESSION) {
            inAccession(text);
        }
        else if (currentTag == URI) {
            inUri(text);
        }
        else if (parentTag == TAXONOMY) {
            inTaxonomy(text);
        }
        else if (parentTag == SEQUENCE) {
            inSequence(text);
        }
    }

    function phyloxmlOnerror(error) {
        console.error(error);
        throw error;
    }

    function addPhyloxmlParserEvents(sax_parser) {
        sax_parser.onopentag = phyloxmlOnopentag;
        sax_parser.onclosetag = phyloxmlOnclosetag;
        sax_parser.ontext = phyloxmlOntext;
        sax_parser.onerror = phyloxmlOnerror;
        // Ignoring: oncdata, oncomment, ondoctype
    }

    // --------------------------------------------------------------
    // Helper functions
    // --------------------------------------------------------------
    function getCurrentClade() {
        return _cladeStack.peek();
    }

    function getCurrentTag() {
        return _tagStack.peek();
    }

    function getCurrentObject() {
        return _objectStack.peek();
    }

    function getAttribute(attribute_name, attributes) {
        if (attribute_name in attributes) {
            return attributes[attribute_name];
        }
        return undefined;
    }

    function addToArrayInCurrentObject(m, value) {
        var obj = getCurrentObject()[m];
        if (obj == undefined) {
            getCurrentObject()[m] = [value];
        }
        else {
            obj.push(value);
        }
    }

    function startNewPhylogeny() {
        _phylogeny = null;
        _cladeStack = new Stack();
        _tagStack = new Stack();
        _objectStack = new Stack();
    }

    // --------------------------------------------------------------
    // Stack
    // --------------------------------------------------------------
    function Stack() {
        this._stack = [];
        this.pop = function () {
            return this._stack.pop();
        };
        this.push = function (item) {
            this._stack.push(item);
        };
        this.peek = function () {
            return this._stack[this._stack.length - 1];
        };
        this.get = function (i) {
            return this._stack[this._stack.length - (1 + i)];
        };
    }

    // --------------------------------------------------------------
    // Main functions
    // --------------------------------------------------------------
    phyloXmlParser.parseAsync = function (stream, parse_options) {
        _phylogenies = [];
        startNewPhylogeny();
        var sax_parser = sax.createStream(true, parse_options);
        addPhyloxmlParserEvents(sax_parser);
        stream.pipe(sax_parser);

        sax_parser.on('end', function (e) {
            console.log();
            console.log("parseAsync: THE END");
            console.log();
            var len = _phylogenies.length;
            console.log("Parsed " + len + " trees:");
            for (var i = 0; i < len; i++) {
                console.log();
                console.log("Tree " + i + ":");
                var str = JSON.stringify(_phylogenies[i], null, 2);
                console.log(str);
            }
        });

        process.stdout.on('drain', function () {
            stream.resume();
        });
    };

    phyloXmlParser.parse = function (source, parse_options) {
        source && ( source = source.toString().trim());

        if (!source) {
            throw new Error('phyloXML source is empty');
        }

        _phylogenies = [];
        startNewPhylogeny();
        var sax_parser = sax.parser(true, parse_options);
        addPhyloxmlParserEvents(sax_parser);

        sax_parser.onend = function (e) {
            console.log();
            console.log("parse: THE END");
            console.log();
        };

        sax_parser.write(source).close();
        return _phylogenies;
    };

    // --------------------------------------------------------------
    // For exporting
    // --------------------------------------------------------------
    if (typeof module !== 'undefined' && module.exports && !global.xmldocAssumeBrowser)
        module.exports.phyloXmlParser = phyloXmlParser;
    else
        this.phyloXmlParser = phyloXmlParser;

})();