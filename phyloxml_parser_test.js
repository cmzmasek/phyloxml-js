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

"use strict";

var phyloxml_parser = require('./phyloxml_parser');
var fs = require('fs');

var a = require('path').join(__dirname, "./data/two_trees.xml");
var b = require('path').join(__dirname, "./data/example_2.xml");
var c = require('path').join(__dirname, "./data/apaf.xml");
var d = require('path').join(__dirname, "./data/amphi_frost.xml");
var e = require('path').join(__dirname, "./data/phyloxml_test2.xml");



var phys = forester.readPhyloXmlFromFile(e);

var len = phys.length;
console.log("Parsed " + len + " tree:");
for (var i = 0; i < len; i++) {
    console.log();
    console.log("Tree " + i + ":");
    var str = JSON.stringify(phys[i], null, 2);
    console.log(str);
}


console.log( "Accession          : " + testAccession() );
console.log( "Annotation         : " + testAnnotation() );
console.log( "Branch Color       : " + testBranchColor() );
console.log( "Confidence         : " + testConfidence() );
console.log( "Cross-References   : " + testCrossReferences() );
console.log( "Date               : " + testDate() );
console.log( "Distribution       : " + testDistribution() );
console.log( "Domain Architecture: " + testDomainArchitecture() );
console.log( "Events             : " + testEvents() );
console.log( "Id                 : " + testId() );
console.log( "Property           : " + testProperty() );
console.log( "Reference          : " + testReference() );
console.log( "Sequence           : " + testSequence() );
console.log( "Taxonomy           : " + testTaxonomy() );
console.log( "URI                : " + testUri() );
console.log( "Clade              : " + testClade() );
console.log( "Phylogeny          : " + testPhylogeny() );
console.log( "UTF8               : " + testUTF8() )



function testAccession() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var x = function(clade) {
        console.log( clade.name);
    };

    var root = forester.findByName(phy, "root node")[0];
    var acc = root.sequences[0].accession;
    if( acc.value !== "Q9BZR8" ) {
        return false;
    }
    if( acc.source !== "UniProtKB" ) {
        return false;
    }
    if( acc.comment !== "outdated" ) {
        return false;
    }
    return true;
}

function testAnnotation() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    var seq = root.sequences[0];
    
    var annotations = seq.annotations;

    if(annotations.length != 3 ) {
        return false;
    }
    if( annotations[0].desc!=="intracellular organelle" ) {
        return false;
    }
    if( annotations[1].ref!=="GO:0005829" ) {
        return false;
    }
    if( annotations[2].ref!=="GO:0006915" ) {
        return false;
    }
    if( annotations[2].source!=="UniProtKB" ) {
        return false;
    }
    if( annotations[2].evidence!=="experimental" ) {
        return false;
    }
    if( annotations[2].type!=="function" ) {
        return false;
    }
    if( annotations[2].desc!=="apoptosis" ) {
        return false;
    }

    var uris = annotations[2].uris;
    if(uris.length != 2 ) {
        return false;
    }
    if(uris[0].type !== "source" ) {
        return false;
    }
    if(uris[0].desc !== "google" ) {
        return false;
    }
    if(uris[0].value !== "http://www.google.com" ) {
        return false;
    }
    if(uris[1].type !== "source2" ) {
        return false;
    }
    if(uris[1].desc !== "bing" ) {
        return false;
    }
    if(uris[1].value !== "http://www.bing.com" ) {
        return false;
    }
    var confidence = annotations[2].confidence;
    if(confidence.value !== 1 ) {
        return false;
    }
    if(confidence.type !== "ml" ) {
        return false;
    }
    if(confidence.stddev !== 0.3 ) {
        return false;
    }
    var properties = annotations[2].properties;
    if(properties.length != 2 ) {
        return false;
    }
    if(properties[0].datatype !== "xsd:double" ) {
        return false;
    }
    if(properties[0].applies_to !== "annotation" ) {
        return false;
    }
    if(properties[0].ref !== "AFFY:expression" ) {
        return false;
    }
    if(properties[0].unit !== "AFFY:x" ) {
        return false;
    }
    if(properties[0].value !== "0.2" ) {
        return false;
    }
    if(properties[1].datatype !== "xsd:string" ) {
        return false;
    }
    if(properties[1].applies_to !== "annotation" ) {
        return false;
    }
    if(properties[1].ref !== "MED:disease" ) {
        return false;
    }
    if(properties[1].value !== "lymphoma" ) {
        return false;
    }
    return true;
}

function testBranchColor() {
    var phys = forester.readPhyloXmlFromFile(e);
    var root = forester.findByName(phys[0], "root node")[0];
    var col=root.color;
    if(col.red !== 2 ) {
        return false;
    }
    if(col.green !== 22 ) {
        return false;
    }
    if(col.blue !== 33 ) {
        return false;
    }
    if(col.alpha !== 123 ) {
        return false;
    }
    return true;
}

function testClade() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    if( root.branch_length !== 0.1 ) {
        return false;
    }
    if( root.id_source !== "id111" ) {
        return false;
    }
    if( root.collapse !== true ) {
        return false;
    }
    if( root.name !== "root node" ) {
        return false;
    }
    if (root.confidences.length != 3) {
        return false;
    }
    if( root.confidences[0].type !== "bootstrap" ) {
        return false;
    }
    if( root.confidences[0].value !== 90 ) {
        return false;
    }
    if( root.confidences[1].type !== "ml" ) {
        return false;
    }
    if( root.confidences[1].value !== 1e-3 ) {
        return false;
    }
    if( root.confidences[2].type !== "decay" ) {
        return false;
    }
    if( root.confidences[2].value !== 2 ) {
        return false;
    }
    if( root.width !== 10.5 ) {
        return false;
    }
    if( !root.color  ) {
        return false;
    }
    if( root.color.red !== 2 ) {
        return false;
    }
    if( root.taxonomies.length !== 2 ) {
        return false;
    }
    if( root.sequences.length !== 2 ) {
        return false;
    }
    if( !root.events ) {
        return false;
    }
    if( root.distributions.length != 2 ) {
        return false;
    }
    if( !root.date ) {
        return false;
    }
    if( root.properties.length !== 2 ) {
        return false;
    }
    if( root.properties[0].value !== "2" ) {
        return false;
    }
    if( root.properties[1].value !== "33" ) {
        return false;
    }
    if( root.clades.length !== 2 ) {
        return false;
    }

    var node_a = forester.findByName(phy, "node a")[0];
    if( node_a.branch_length !== 0.2 ) {
        return false;
    }
    if( node_a.taxonomies[0].code !== "CAEEL" ) {
        return false;
    }
    if( node_a.clades ) {
        return false;
    }
    var node_b = forester.findByName(phy, "node b")[0];
    if( !node_b ) {
        return false;
    }
    if( node_b.clades.length != 3 ) {
        return false;
    }
    var node_ba = forester.findByName(phy, "node ba")[0];
    if( !node_ba ) {
        return false;
    }
    if( node_ba.clades ) {
        return false;
    }
    var node_bb = forester.findByName(phy, "node bb")[0];
    if( node_bb.taxonomies[0].code !== "NEMVE" ) {
        return false;
    }
    if( node_bb.clades ) {
        return false;
    }
    var node_bc = forester.findByName(phy, "node bc")[0];
    if( node_bc.sequences[0].name !== "bc seq" ) {
        return false;
    }
    if( node_bc.clades ) {
        return false;
    }
    return true;
}

function testConfidence() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    if(root.confidences.length != 3 ) {
        return false;
    }
    if(root.confidences[0].type !== "bootstrap" ) {
        return false;
    }
    if(root.confidences[0].value !== 90 ) {
        return false;
    }
    if(root.confidences[1].type !== "ml" ) {
        return false;
    }
    if(root.confidences[1].value !== 1e-3 ) {
        return false;
    }
    if(root.confidences[1].stddev !== 1.1e-10 ) {
        return false;
    }
    if(root.confidences[2].type !== "decay" ) {
        return false;
    }
    if(root.confidences[2].value !== 2 ) {
        return false;
    }
    return true;
}


function testCrossReferences() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    var xrefs = root.sequences[0].cross_references;
    if(  xrefs.length != 4 ) {
        return false;
    }
    if( xrefs[0].value!=="383" ) {
        return false;
    }
    if(xrefs[0].source!=="UNIPROTKB" ) {
        return false;
    }
    if( xrefs[1].value!=="1G5M" ) {
        return false;
    }
    if( xrefs[1].source!=="PDB" ) {
        return false;
    }
    if( xrefs[2].value!=="hsa:596" ) {
        return false;
    }
    if( xrefs[2].source!="KEGG" ) {
        return false;
    }
    if(xrefs[3].value!=="2G5M" ) {
        return false;
    }
    if( xrefs[3].source!=="PDB" ) {
        return false;
    }
    if( xrefs[3].comment!=="?" ) {
        return false;
    }
    return true;
}

function testDate() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];
    var node_ba = forester.findByName(phy, "node ba")[0];
    var date_ba=node_ba.date;
    if (date_ba.unit !== "mya") {
        return false;
    }
    if (date_ba.desc !== "Silurian") {
        return false;
    }
    if (date_ba.value !== 435) {
        return false;
    }
    if (date_ba.minimum !== 416) {
        return false;
    }
    if (date_ba.maximum !== 443.7) {
        return false;
    }
    var node_bb = forester.findByName(phy, "node bb")[0];
    var date_bb=node_bb.date;
    if (date_bb.desc !== "Triassic") {
        return false;
    }
    var node_bc = forester.findByName(phy, "node bc")[0];
    var date_bc=node_bc.date;
    if (date_bc.value !== 433) {
        return false;
    }
    return true;
}

function testDistribution() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];
    var root = forester.findByName(phy, "root node")[0];
    var root_dist=root.distributions;
    if(root_dist.length != 2 ) {
        return false;
    }
    if(root_dist[0].desc !== "irgendwo" ) {
        return false;
    }
    if(root_dist[1].desc !== "anderswo" ) {
        return false;
    }
    var node_ba = forester.findByName(phy, "node ba")[0];
    var ba_dist=node_ba.distributions;
    if(ba_dist.length != 1 ) {
       return false;
    }
    if(ba_dist[0].desc !== "Africa" ) {
       return false;
    }
    return true;
}

function testDomainArchitecture() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];
    var nodebc = forester.findByName(phy, "node bc")[0];
    var da=nodebc.sequences[0].domain_architecture;
    if(!da) {
        return false;
    }
    if(da.length !== 124) {
        return false;
    }
    if(da.domains[0].from !== 120) {
        return false;
    }
    if(da.domains[0].to !== 130) {
        return false;
    }
    if(da.domains[0].confidence !== 0.9) {
        return false;
    }
    if(da.domains[0].name !== "A") {
        return false;
    }
    //
    if(da.domains[1].from !== 21) {
        return false;
    }
    if(da.domains[1].to !== 44) {
        return false;
    }
    if(da.domains[1].confidence !== 0) {
        return false;
    }
    if(da.domains[1].id !== "pfam") {
        return false;
    }
    if(da.domains[1].name !== "B") {
        return false;
    }
    return true;
}

function testEvents() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];
    var root = forester.findByName(phy, "root node")[0];
    var events=root.events;
    if(!events) {
        return false;
    }
    if(events.type !== "mixed") {
        return false;
    }
    if(events.duplications !== 1) {
        return false;
    }
    if(events.confidence.type!=="bs") {
        return false;
    }
    if(events.confidence.value!==99) {
        return false;
    }

    var a = forester.findByName(phy, "node a")[0];
    events=a.events;
    if(!events) {
        return false;
    }
    if(events.type !== "other") {
        return false;
    }
    if(events.duplications !== 58) {
        return false;
    }
    if(events.speciations !== 59403) {
        return false;
    }
    if(events.losses !== 58485) {
        return false;
    }
    if(events.confidence.type!=="p") {
        return false;
    }
    if(events.confidence.value!==0.9901) {
        return false;
    }
    return true;
}

function testId() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    var t0 = root.taxonomies[0];
    if (!t0.id) {
        return false;
    }
    if (t0.id.provider !== "ncbi") {
        return false;
    }
    if (t0.id.value !== "1") {
        return false;
    }
    return true;
}

function testProperty() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    if (phy.properties.length != 2) {
        return false;
    }
    if (phy.properties[0].datatype !== "xsd:double") {
        return false;
    }
    if (phy.properties[0].applies_to !== "phylogeny") {
        return false;
    }
    if (phy.properties[0].value !== "2") {
        return false;
    }
    if (phy.properties[1].datatype !== "xsd:string") {
        return false;
    }
    if (phy.properties[1].applies_to !== "phylogeny") {
        return false;
    }
    if (phy.properties[1].value !== "cell death") {
        return false;
    }
    return true;
}


function testReference() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];
    var root = forester.findByName(phy, "root node")[0];

    var refs=root.references;
    if(!refs) {
        return false;
    }
    if(refs.length != 2) {
        return false;
    }
    if(refs[0].doi !== "10.1038/387489a0") {
        return false;
    }
    if(!refs[0].desc.includes("Aguinaldo")) {
        return false;
    }
    if(refs[1].doi !== "10.1036/59494") {
        return false;
    }
    return true;
}

function testSequence() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    if(root.sequences.length != 2 ) {
        return false;
    }
    if(root.sequences[1].symbol !== "BCL2" ) {
        return false;
    }
    var seq = root.sequences[0];
    if(seq.type !== "protein" ) {
        return false;
    }
    if(seq.id_source !== "idsource" ) {
        return false;
    }
    if(seq.symbol !== "BCL2L14" ) {
        return false;
    }
    if(seq.accession.value !== "Q9BZR8" ) {
        return false;
    }
    if(seq.name !== "Apoptosis facilitator Bcl-2-like 14 protein" ) {
        return false;
    }
    if(seq.gene_name !== "bcl2l14" ) {
        return false;
    }
    if(seq.location !== "12p13-p12" ) {
        return false;
    }
    if(!seq.mol_seq) {
        return false;
    }
    if( seq.mol_seq.is_aligned !== true) {
        return false;
    }
    if( seq.mol_seq.value !== "MCSTSGCDLEEIPLDDDDLNTIEFKILAYY") {
        return false;
    }
    var xrefs = root.sequences[0].cross_references;
    if(  xrefs.length != 4 ) {
        return false;
    }
    var annotations = seq.annotations;
    if(annotations.length != 3 ) {
        return false;
    }
    var uris = annotations[2].uris;
    if(uris.length != 2 ) {
        return false;
    }
    var confidence = annotations[2].confidence;
    if(confidence.value !== 1 ) {
        return false;
    }
    var properties = annotations[2].properties;
    if(properties.length != 2 ) {
        return false;
    }
    return true;
}

function testTaxonomy() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    if (root.taxonomies.length != 2) {
       return false;
    }
    var t0 = root.taxonomies[0];
    if (t0.id_source !== "qwerty1") {
       return false;
    }
    if (t0.id.provider !== "ncbi") {
        return false;
    }
    if (t0.id.value !== "1") {
        return false;
    }
    if (t0.code !== "ECDYS") {
        return false;
    }
    if (t0.scientific_name !== "ecdysozoa") {
        return false;
    }
    if (t0.authority !== "authority, 1999") {
        return false;
    }
    if (t0.common_name !== "molting animals") {
        return false;
    }
    if (t0.synonyms.length != 2) {
        return false;
    }
    if (t0.synonyms[0] !== "Ecdy") {
        return false;
    }
    if (t0.synonyms[1] !== "The Ecdysozoa") {
        return false;
    }
    if (t0.rank !== "phylum") {
        return false;
    }
    if (t0.uris.length != 2) {
        return false;
    }
    if (t0.uris[0].type !== "img") {
        return false;
    }
    if (t0.uris[0].value !== "http://www.molting.org/m.jpg") {
        return false;
    }
    if (t0.uris[1].type !== "source") {
        return false;
    }
    if (t0.uris[1].desc !== "original source") {
        return false;
    }
    if (t0.uris[1].value !== "http://www.ecdysozoa.org/") {
        return false;
    }
    return true;
}

function testUri() {
    var phys = forester.readPhyloXmlFromFile(e);
    var phy = phys[0];

    var root = forester.findByName(phy, "root node")[0];

    if (root.taxonomies.length != 2) {
        return false;
    }
    var t0 = root.taxonomies[0];

    if (t0.uris.length != 2) {
        return false;
    }
    if (t0.uris[0].type !== "img") {
        return false;
    }
    if (t0.uris[0].value !== "http://www.molting.org/m.jpg") {
        return false;
    }
    if (t0.uris[1].type !== "source") {
        return false;
    }
    if (t0.uris[1].desc !== "original source") {
        return false;
    }
    if (t0.uris[1].value !== "http://www.ecdysozoa.org/") {
        return false;
    }
    return true;
}


function testPhylogeny() {
    var phys = forester.readPhyloXmlFromFile(e);
    if (!phys) {
        return false;
    }
    if (phys.length !== 3) {
        return false;
    }
    var phy = phys[0];
    if (phy.rooted !== true) {
        return false;
    }
    if (phy.rerootable !== true) {
        return false;
    }
    if (phy.branch_length_unit !== "c") {
        return false;
    }
    if (phy.type !== "gene_tree") {
        return false;
    }
    if (phy.name !== "tree 0") {
        return false;
    }
    if (phy.id.provider !== "treebank") {
        return false;
    }
    if (phy.id.value !== "1-1") {
        return false;
    }
    if (phy.description !== "test phylogeny") {
        return false;
    }
    if (phy.date !== "2002-05-30T09:00:00") {
        return false;
    }
    if (phy.confidences.length !== 2) {
        return false;
    }
    if (phy.confidences[0].type !== "ml") {
        return false;
    }
    if (phy.confidences[0].value !== 0.999) {
        return false;
    }
    if (phy.confidences[1].type !== "pp") {
        return false;
    }
    if (phy.confidences[1].value !== 0.955) {
        return false;
    }
    if (phy.clades.length !== 1) {
        return false;
    }

    if (phy.properties.length != 2) {
        return false;
    }
    if (phy.properties[0].datatype !== "xsd:double") {
        return false;
    }
    if (phy.properties[0].applies_to !== "phylogeny") {
        return false;
    }
    if (phy.properties[0].value !== "2") {
        return false;
    }
    if (phy.properties[1].datatype !== "xsd:string") {
        return false;
    }
    if (phy.properties[1].applies_to !== "phylogeny") {
        return false;
    }
    if (phy.properties[1].value !== "cell death") {
        return false;
    }
    return true;
}

function testUTF8() {
    var phys = forester.readPhyloXmlFromFile(e);
    var root = forester.findByName(phys[0], "root node")[0];
    if (root.taxonomies.length != 2) {
        return false;
    }
    var s = root.taxonomies[1].synonyms
    if (s[0] !== "Æ Ä ä, ö and ü>– —") {
        return false;
    }
    if (s[1] !== "한글") {
        return false;
    }
    if (s[2] !== "日本語ひらがなカタカナ") {
        return false;
    }
    if (s[3] !== "русский алфавит") {
       return false;
    }
    if (s[4] !== "繁體字") {
        return false;
    }
    if (s[5] !== "ภาษาไทย") {
        return false;
    }
    if (s[6] !== "Tiếng Việt") {
        return false;
    }
    return true;
}


// Asynchronous parsing of phyloXML-formatted stream:
//var stream = fs.createReadStream(xmlfile, {encoding: 'utf8'});
//p.parseAsync(stream, {trim: true, normalize: true});
