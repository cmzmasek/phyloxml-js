/**
 *  Copyright (C) 2017 Christian M. Zmasek
 *  Copyright (C) 2017 J. Craig Venter Institute
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

var fs = require('fs');
var px = require('../phyloxml').phyloXml;

var t1 = require('path').join(__dirname, "./data/phyloxml_test_1.xml");

// Count failures and EXIT NON-ZERO on any. Before this the harness printed
// "FAIL" and exited 0 regardless, so `npm test` reported success with tests
// failing -- a harness that gives a wrong answer nothing argues with.
var failed = 0;

function runTest(name, fn) {
    var ok = false;
    try {
        ok = fn() === true;
    } catch (e) {
        console.log('    ' + name + ' threw: ' + e.message);
    }
    if (!ok) {
        failed++;
    }
    console.log(name + ': ' + (ok ? 'pass' : 'FAIL'));
}

runTest("Versions agree      ", testVersionsAgree);
runTest("Accession          ", testAccession);
runTest("Annotation         ", testAnnotation);
runTest("Branch Color       ", testBranchColor);
runTest("Confidence         ", testConfidence);
runTest("Cross-References   ", testCrossReferences);
runTest("Date               ", testDate);
runTest("Distribution       ", testDistribution);
runTest("Domain Architecture", testDomainArchitecture);
runTest("Events             ", testEvents);
runTest("Id                 ", testId);
runTest("Property           ", testProperty);
runTest("Reference          ", testReference);
runTest("Sequence           ", testSequence);
runTest("Taxonomy           ", testTaxonomy);
runTest("URI                ", testUri);
runTest("Clade              ", testClade);
runTest("Phylogeny          ", testPhylogeny);
runTest("Clade Relation     ", testCladeRelation);
runTest("Sequence Relation  ", testSequenceRelation);
runTest("UTF8               ", testUTF8);
runTest("Roundtrip          ", testRoundtrip);
runTest("No schemaLocation  ", testNoSchemaLocationHint);
runTest("Clade dates        ", testCladeDates);

if (failed > 0) {
    console.log('\n' + failed + ' test(s) FAILED');
    process.exit(1);
}
console.log('\nAll tests passed');


function readPhyloXmlFromFile(fileName) {
    var text = fs.readFileSync(fileName, 'utf8');
    return px.parse(text, {trim: true, normalize: true});
}

function findByName(clade, name) {
    var found_clades = [];
    var findByName = function (clade) {
        if (clade.name === name) {
            found_clades.push(clade);
        }
    };
    visitDfs(clade, findByName);
    return found_clades;
}

function visitDfs(clade, func) {
    if (func) {
        func(clade);
    }
    if (clade.children) {
        clade.children.forEach(function (child) {
            visitDfs(child, func);
        })
    }
}

function testAccession() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    var root = findByName(phy, "root node")[0];
    var acc = root.sequences[0].accession;
    if (acc.value !== "Q9BZR8") {
        return false;
    }
    if (acc.source !== "UniProtKB") {
        return false;
    }
    if (acc.comment !== "outdated") {
        return false;
    }
    return true;
}

function testAnnotation() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

    var seq = root.sequences[0];

    var annotations = seq.annotations;

    if (annotations.length != 3) {
        return false;
    }
    if (annotations[0].desc !== "intracellular organelle") {
        return false;
    }
    if (annotations[1].ref !== "GO:0005829") {
        return false;
    }
    if (annotations[2].ref !== "GO:0006915") {
        return false;
    }
    if (annotations[2].source !== "UniProtKB") {
        return false;
    }
    if (annotations[2].evidence !== "experimental") {
        return false;
    }
    if (annotations[2].type !== "function") {
        return false;
    }
    if (annotations[2].desc !== "apoptosis") {
        return false;
    }

    var uris = annotations[2].uris;
    if (uris.length != 2) {
        return false;
    }
    if (uris[0].type !== "source") {
        return false;
    }
    if (uris[0].desc !== "google") {
        return false;
    }
    if (uris[0].value !== "http://www.google.com") {
        return false;
    }
    if (uris[1].type !== "source2") {
        return false;
    }
    if (uris[1].desc !== "bing") {
        return false;
    }
    if (uris[1].value !== "http://www.bing.com") {
        return false;
    }
    var confidence = annotations[2].confidence;
    if (confidence.value !== 1) {
        return false;
    }
    if (confidence.type !== "ml") {
        return false;
    }
    if (confidence.stddev !== 0.3) {
        return false;
    }
    var properties = annotations[2].properties;
    if (properties.length != 2) {
        return false;
    }
    if (properties[0].datatype !== "xsd:double") {
        return false;
    }
    if (properties[0].applies_to !== "annotation") {
        return false;
    }
    if (properties[0].ref !== "AFFY:expression") {
        return false;
    }
    if (properties[0].unit !== "AFFY:x") {
        return false;
    }
    if (properties[0].value !== "0.2") {
        return false;
    }
    if (properties[1].datatype !== "xsd:string") {
        return false;
    }
    if (properties[1].applies_to !== "annotation") {
        return false;
    }
    if (properties[1].ref !== "MED:disease") {
        return false;
    }
    if (properties[1].value !== "lymphoma") {
        return false;
    }
    return true;
}

function testBranchColor() {
    var phys = readPhyloXmlFromFile(t1);
    var root = findByName(phys[0], "root node")[0];
    var col = root.color;
    if (col.red !== 2) {
        return false;
    }
    if (col.green !== 22) {
        return false;
    }
    if (col.blue !== 33) {
        return false;
    }
    if (col.alpha !== 123) {
        return false;
    }
    return true;
}

function testClade() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

    if (root.branch_length !== 0.1) {
        return false;
    }
    if (root.id_source !== "id111") {
        return false;
    }
    if (root.collapse !== true) {
        return false;
    }
    if (root.name !== "root node") {
        return false;
    }
    if (root.confidences.length != 3) {
        return false;
    }
    if (root.confidences[0].type !== "bootstrap") {
        return false;
    }
    if (root.confidences[0].value !== 90) {
        return false;
    }
    if (root.confidences[1].type !== "ml") {
        return false;
    }
    if (root.confidences[1].value !== 1e-3) {
        return false;
    }
    if (root.confidences[2].type !== "decay") {
        return false;
    }
    if (root.confidences[2].value !== 2) {
        return false;
    }
    if (root.width !== 10.5) {
        return false;
    }
    if (!root.color) {
        return false;
    }
    if (root.color.red !== 2) {
        return false;
    }
    if (root.taxonomies.length !== 2) {
        return false;
    }
    if (root.sequences.length !== 2) {
        return false;
    }
    if (!root.events) {
        return false;
    }
    if (root.distributions.length != 2) {
        return false;
    }
    if (!root.date) {
        return false;
    }
    if (root.properties.length !== 2) {
        return false;
    }
    if (root.properties[0].value !== "2") {
        return false;
    }
    if (root.properties[1].value !== "33") {
        return false;
    }
    if (root.children.length !== 2) {
        return false;
    }

    var node_a = findByName(phy, "node a")[0];
    if (node_a.branch_length !== 0.2) {
        return false;
    }
    if (node_a.taxonomies[0].code !== "CAEEL") {
        return false;
    }
    if (node_a.children) {
        return false;
    }
    var node_b = findByName(phy, "node b")[0];
    if (!node_b) {
        return false;
    }
    if (node_b.children.length != 3) {
        return false;
    }
    var node_ba = findByName(phy, "node ba")[0];
    if (!node_ba) {
        return false;
    }
    if (node_ba.children) {
        return false;
    }
    var node_bb = findByName(phy, "node bb")[0];
    if (node_bb.collapse !== false) {
        return false;
    }
    if (node_bb.taxonomies[0].code !== "NEMVE") {
        return false;
    }
    if (node_bb.children) {
        return false;
    }
    var node_bc = findByName(phy, "node bc")[0];
    if (node_bc.sequences[0].name !== "bc seq") {
        return false;
    }
    if (node_bc.children) {
        return false;
    }
    return true;
}

function testConfidence() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

    if (root.confidences.length != 3) {
        return false;
    }
    if (root.confidences[0].type !== "bootstrap") {
        return false;
    }
    if (root.confidences[0].value !== 90) {
        return false;
    }
    if (root.confidences[1].type !== "ml") {
        return false;
    }
    if (root.confidences[1].value !== 1e-3) {
        return false;
    }
    if (root.confidences[1].stddev !== 1.1e-10) {
        return false;
    }
    if (root.confidences[2].type !== "decay") {
        return false;
    }
    if (root.confidences[2].value !== 2) {
        return false;
    }
    return true;
}


function testCrossReferences() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

    var xrefs = root.sequences[0].cross_references;
    if (xrefs.length != 4) {
        return false;
    }
    if (xrefs[0].value !== "383") {
        return false;
    }
    if (xrefs[0].source !== "UNIPROTKB") {
        return false;
    }
    if (xrefs[1].value !== "1G5M") {
        return false;
    }
    if (xrefs[1].source !== "PDB") {
        return false;
    }
    if (xrefs[2].value !== "hsa:596") {
        return false;
    }
    if (xrefs[2].source != "KEGG") {
        return false;
    }
    if (xrefs[3].value !== "2G5M") {
        return false;
    }
    if (xrefs[3].source !== "PDB") {
        return false;
    }
    if (xrefs[3].comment !== "?") {
        return false;
    }
    return true;
}

function testDate() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    var node_ba = findByName(phy, "node ba")[0];
    var date_ba = node_ba.date;
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
    var node_bb = findByName(phy, "node bb")[0];
    var date_bb = node_bb.date;
    if (date_bb.desc !== "Triassic") {
        return false;
    }
    var node_bc = findByName(phy, "node bc")[0];
    var date_bc = node_bc.date;
    if (date_bc.value !== 433) {
        return false;
    }
    return true;
}

function testDistribution() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    var root = findByName(phy, "root node")[0];
    var root_dist = root.distributions;
    if (root_dist.length != 2) {
        return false;
    }
    if (root_dist[0].desc !== "irgendwo") {
        return false;
    }
    if (root_dist[1].desc !== "anderswo") {
        return false;
    }
    if (!root_dist[0].points) {
        return false;
    }
    if (root_dist[0].points.length != 2) {
        return false;
    }
    var p0 = root_dist[0].points[0];
    var p1 = root_dist[0].points[1];
    if (p0.geodetic_datum !== "WGS84") {
        return false;
    }
    if (p0.alt_unit !== "m") {
        return false;
    }
    if (p0.lat !== "35.9296730123456789") {
        return false;
    }
    if (p0.long !== "-78.9482370123456789") {
        return false;
    }
    if (p0.alt !== "1303") {
        return false;
    }
    if (p1.lat !== "129.549495485834893") {
        return false;
    }
    var node_ba = findByName(phy, "node ba")[0];
    var ba_dist = node_ba.distributions;
    if (ba_dist.length != 1) {
        return false;
    }
    if (ba_dist[0].desc !== "Africa") {
        return false;
    }
    return true;
}

function testDomainArchitecture() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    var nodebc = findByName(phy, "node bc")[0];
    var da = nodebc.sequences[0].domain_architecture;
    if (!da) {
        return false;
    }
    if (da.length !== 124) {
        return false;
    }
    if (da.domains[0].from !== 120) {
        return false;
    }
    if (da.domains[0].to !== 130) {
        return false;
    }
    if (da.domains[0].confidence !== 0.9) {
        return false;
    }
    if (da.domains[0].name !== "A") {
        return false;
    }
    //
    if (da.domains[1].from !== 21) {
        return false;
    }
    if (da.domains[1].to !== 44) {
        return false;
    }
    if (da.domains[1].confidence !== 0) {
        return false;
    }
    if (da.domains[1].id !== "pfam") {
        return false;
    }
    if (da.domains[1].name !== "B") {
        return false;
    }
    return true;
}

function testEvents() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    var root = findByName(phy, "root node")[0];
    var events = root.events;
    if (!events) {
        return false;
    }
    if (events.type !== "mixed") {
        return false;
    }
    if (events.duplications !== 1) {
        return false;
    }
    if (events.confidence.type !== "bs") {
        return false;
    }
    if (events.confidence.value !== 99) {
        return false;
    }

    var a = findByName(phy, "node a")[0];
    events = a.events;
    if (!events) {
        return false;
    }
    if (events.type !== "other") {
        return false;
    }
    if (events.duplications !== 58) {
        return false;
    }
    if (events.speciations !== 59403) {
        return false;
    }
    if (events.losses !== 58485) {
        return false;
    }
    if (events.confidence.type !== "p") {
        return false;
    }
    if (events.confidence.value !== 0.9901) {
        return false;
    }
    return true;
}

function testId() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

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
    var phys = readPhyloXmlFromFile(t1);
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
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    var root = findByName(phy, "root node")[0];

    var refs = root.references;
    if (!refs) {
        return false;
    }
    if (refs.length != 2) {
        return false;
    }
    if (refs[0].doi !== "10.1038/387489a0") {
        return false;
    }
    if (!refs[0].desc.includes("Aguinaldo")) {
        return false;
    }
    if (refs[1].doi !== "10.1036/59494") {
        return false;
    }
    return true;
}

function testSequence() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

    if (root.sequences.length != 2) {
        return false;
    }
    if (root.sequences[1].symbol !== "BCL2") {
        return false;
    }
    var seq = root.sequences[0];
    if (seq.type !== "protein") {
        return false;
    }
    if (seq.id_source !== "idsource") {
        return false;
    }
    if (seq.symbol !== "BCL2L14") {
        return false;
    }
    if (seq.accession.value !== "Q9BZR8") {
        return false;
    }
    if (seq.name !== "Apoptosis facilitator Bcl-2-like 14 protein") {
        return false;
    }
    if (seq.gene_name !== "bcl2l14") {
        return false;
    }
    if (seq.location !== "12p13-p12") {
        return false;
    }
    if (!seq.mol_seq) {
        return false;
    }
    if (seq.mol_seq.is_aligned !== true) {
        return false;
    }
    if (seq.mol_seq.value !== "MCSTSGCDLEEIPLDDDDLNTIEFKILAYY") {
        return false;
    }
    var xrefs = root.sequences[0].cross_references;
    if (xrefs.length != 4) {
        return false;
    }
    var annotations = seq.annotations;
    if (annotations.length != 3) {
        return false;
    }
    var uris = annotations[2].uris;
    if (uris.length != 2) {
        return false;
    }
    var confidence = annotations[2].confidence;
    if (confidence.value !== 1) {
        return false;
    }
    var properties = annotations[2].properties;
    if (properties.length != 2) {
        return false;
    }
    return true;
}

function testTaxonomy() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

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
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];

    var root = findByName(phy, "root node")[0];

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
    var phys = readPhyloXmlFromFile(t1);
    if (!phys) {
        return false;
    }
    if (phys.length !== 4) {
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
    if (phy.children.length !== 1) {
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

function testCladeRelation() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[2];
    if (!phy.clade_relations) {
        return false;
    }
    if (phy.clade_relations.length != 2) {
        return false;
    }
    var cl0 = phy.clade_relations[0];
    var cl1 = phy.clade_relations[1];
    if (cl0.id_ref_0 !== "i0") {
        return false;
    }
    if (cl0.id_ref_1 !== "i1") {
        return false;
    }
    if (cl0.distance !== 0.34) {
        return false;
    }
    if (cl0.type !== "parent") {
        return false;
    }
    if (cl0.confidence.type !== "pp") {
        return false;
    }
    if (cl0.confidence.stddev !== 1.1e-10) {
        return false;
    }
    if (cl0.confidence.value !== 1e-3) {
        return false;
    }
    if (cl1.id_ref_0 !== "i1") {
        return false;
    }
    if (cl1.id_ref_1 !== "i0") {
        return false;
    }
    if (cl1.distance !== 2) {
        return false;
    }
    if (cl1.confidence.value !== 1e-4) {
        return false;
    }
    return true;
}

function testSequenceRelation() {
    var phys = readPhyloXmlFromFile(t1);
    var phy = phys[0];
    if (!phy.sequence_relations) {
        return false;
    }
    if (phy.sequence_relations.length != 2) {
        return false;
    }
    var s0 = phy.sequence_relations[0];
    var s1 = phy.sequence_relations[1];
    if (s0.id_ref_0 !== "abc") {
        return false;
    }
    if (s0.id_ref_1 !== "xyz") {
        return false;
    }

    if (s0.distance !== 0.34) {
        return false;
    }

    if (s0.type !== "ultra_paralogy") {
        return false;
    }
    if (s0.confidence.type !== "pp") {
        return false;
    }
    if (s0.confidence.stddev !== 1.1e-10) {
        return false;
    }
    if (s0.confidence.value !== 1e-3) {
        return false;
    }
    if (s1.confidence.stddev !== 1.245836) {
        return false;
    }
    if (s1.confidence.value !== 99.0000001) {
        console.log(s1.confidence.value);
        return false;
    }
    if (s1.id_ref_0 !== "xyz") {
        return false;
    }
    if (s1.id_ref_1 !== "abc") {
        return false;
    }
    if (s1.distance !== 2) {
        return false;
    }
    return true;
}

function testUTF8() {
    var phys = readPhyloXmlFromFile(t1);
    var root = findByName(phys[0], "root node")[0];
    if (root.taxonomies.length != 2) {
        return false;
    }
    var s = root.taxonomies[1].synonyms;
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

function testRoundtrip() {
    var phys = readPhyloXmlFromFile(t1);
    var phy0 = phys[3];

    var x0 = px.toPhyloXML(phy0, 6);

    var phy1 = px.parse(x0)[0];
    var x1 = px.toPhyloXML(phy1, 6);
    var phy2 = px.parse(x1)[0];
    if (phy2.rooted !== false) {
        return false;
    }
    if (phy2.rerootable !== false) {
        return false;
    }
    if (phy2.branch_length_unit !== "c") {
        return false;
    }
    if (phy2.type !== "gene_tree") {
        return false;
    }
    if (phy2.name !== 't3') {
        return false;
    }
    if (phy2.description !== 'test phylogeny') {
        return false;
    }
    if (phy2.date !== '2002-05-30T09:30:10.5') {
        return false;
    }

    var root = findByName(phy2, "rootnode")[0];

    // Accession
    var acc = root.sequences[0].accession;
    if (acc.value !== "Q9BZR8") {
        return false;
    }
    if (acc.source !== "UniProtKB") {
        return false;
    }
    if (acc.comment !== "outdated") {
        return false;
    }

    // Color
    var col = root.color;
    if (col.red !== 0) {
        return false;
    }
    if (col.green !== 22) {
        return false;
    }
    if (col.blue !== 33) {
        return false;
    }
    if (col.alpha !== 123) {
        return false;
    }

    // Confidences
    if (root.confidences.length != 3) {
        return false;
    }
    if (root.confidences[0].type !== "bootstrap") {
        return false;
    }
    if (root.confidences[0].value !== 90) {
        return false;
    }
    if (root.confidences[1].type !== "ml") {
        return false;
    }
    if (root.confidences[1].value !== 1e-3) {
        return false;
    }
    if (root.confidences[1].stddev !== 1.1e-10) {
        return false;
    }
    if (root.confidences[2].type !== "decay") {
        return false;
    }
    if (root.confidences[2].value !== 2) {
        return false;
    }

    // Id
    var ta0 = root.taxonomies[0];
    if (!ta0.id) {
        return false;
    }
    if (ta0.id.provider !== "ncbi") {
        return false;
    }
    if (ta0.id.value !== "1") {
        return false;
    }

    // Sequence
    if (root.sequences.length != 2) {
        return false;
    }
    if (root.sequences[1].symbol !== "BCL2") {
        return false;
    }
    var seq = root.sequences[0];
    if (seq.type !== "protein") {
        return false;
    }
    if (seq.id_source !== "idsource") {
        return false;
    }
    if (seq.symbol !== "BCL2L14") {
        return false;
    }
    if (seq.accession.value !== "Q9BZR8") {
        return false;
    }
    if (seq.name !== "Apoptosis facilitator Bcl-2-like 14 protein") {
        return false;
    }
    if (seq.gene_name !== "bcl2l14") {
        return false;
    }
    if (seq.location !== "12p13-p12") {
        return false;
    }
    if (!seq.mol_seq) {
        return false;
    }
    if (seq.mol_seq.is_aligned !== true) {
        return false;
    }
    if (seq.mol_seq.value !== "MCSTSGCDLEEIPLDDDDLNTIEFKILAYY") {
        return false;
    }

    // Taxonomy
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
    if (t0.authority !== "authority, 1999 < \" ' & >") {
        return false;
    }
    if (t0.common_name !== "molting animals <") {
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

    // UTF8
    var utf = root.taxonomies[1].synonyms;
    if (utf[0] !== "Æ Ä ä, ö and ü>– —") {
        return false;
    }

    if (utf[1] !== "한글") {
        return false;
    }
    if (utf[2] !== "日本語ひらがなカタカナ") {
        return false;
    }
    if (utf[3] !== "русский алфавит") {
        return false;
    }
    if (utf[4] !== "繁體字") {
        return false;
    }
    if (utf[5] !== "ภาษาไทย") {
        return false;
    }
    if (utf[6] !== "Tiếng Việt") {
        return false;
    }

    // Clade
    if (root.branch_length !== 0.1) {
        return false;
    }
    if (root.id_source !== "id111") {
        return false;
    }
    if (root.collapse !== true) {
        return false;
    }
    if (root.name !== "rootnode") {
        return false;
    }
    if (root.confidences.length != 3) {
        return false;
    }
    if (root.confidences[0].type !== "bootstrap") {
        return false;
    }
    if (root.confidences[0].value !== 90) {
        return false;
    }
    if (root.confidences[1].type !== "ml") {
        return false;
    }
    if (root.confidences[1].value !== 1e-3) {
        return false;
    }
    if (root.confidences[2].type !== "decay") {
        return false;
    }
    if (root.confidences[2].value !== 2) {
        return false;
    }
    if (root.width !== 10.5) {
        return false;
    }

    //Properties
    var props = root.properties;
    if (props.length !== 4) {
        return false;
    }
    var p0 = props[0];
    var p1 = props[1];
    var p2 = props[2];
    var p3 = props[3];

    if (p0.ref !== "F:foo") {
        return false;
    }
    if (p0.datatype !== "xsd:int") {
        return false;
    }
    if (p0.applies_to !== "clade") {
        return false;
    }
    if (p0.value !== '2') {
        return false;
    }

    if (p1.ref !== "F:bar") {
        return false;
    }
    if (p1.datatype !== "xsd:int") {
        return false;
    }
    if (p1.applies_to !== "clade") {
        return false;
    }
    if (p1.value !== '33') {
        return false;
    }

    if (p2.ref !== "F:couldbeanything") {
        return false;
    }
    if (p2.datatype !== "xsd:double") {
        return false;
    }
    if (p2.applies_to !== "other") {
        return false;
    }
    if (p2.value !== '2.34202') {
        return false;
    }
    if (p2.unit !== 'my:unit') {
        return false;
    }

    if (p3.ref !== "F:couldbeanything2") {
        return false;
    }
    if (p3.datatype !== "xsd:double") {
        return false;
    }
    if (p3.applies_to !== "other") {
        return false;
    }
    if (p3.value !== '2.34202') {
        return false;
    }
    if (p3.unit !== 'my:unit2') {
        return false;
    }
    if (p3.id_ref !== 'qwerty1') {
        return false;
    }

    // Events
    var events = root.events;
    if (!events) {
        return false;
    }
    if (events.type !== "mixed") {
        return false;
    }
    if (events.duplications !== 1) {
        return false;
    }
    if (events.confidence.type !== "bs") {
        return false;
    }
    if (events.confidence.value !== 99) {
        return false;
    }

    return true;
}

// The writer must NOT emit an xsi:schemaLocation hint, and the parser MUST
// still accept files that carry one. Both halves matter: phyloxml.org lapsed
// and is held by an unrelated party, so writing a pointer to it is writing a
// pointer to somewhere we no longer control -- but every phyloXML file
// written before 2026-09-10 has that hint in it, and those must keep opening.
// The NAMESPACE is untouched on purpose: it is an opaque identifier, not a
// location, and changing it would break the format.
function testNoSchemaLocationHint() {
    var phys = readPhyloXmlFromFile(t1);

    // the fixture itself still carries the old hint -- that is what makes the
    // second half of this test meaningful
    var src = fs.readFileSync(t1, 'utf8');
    if (src.indexOf('schemaLocation') < 0) {
        return false;   // fixture no longer exercises the legacy form
    }
    if (phys.length < 1) {
        return false;   // a file WITH the hint must parse
    }

    var x = px.toPhyloXML(phys[0], 6);
    if (x.indexOf('schemaLocation') >= 0 || x.indexOf('xmlns:xsi') >= 0) {
        return false;   // never written
    }
    if (x.indexOf('<phyloxml xmlns="http://www.phyloxml.org">') < 0) {
        return false;   // the namespace stays exactly as it was
    }
    // and our own hint-free output reads back
    return px.parse(x).length === 1;
}

// The version lives in TWO places here and they must agree. archaeopteryx-js
// shipped 3.2.0 to npm reporting itself as 3.1.0 for exactly this reason, and
// npm versions are immutable, so the correction cost a whole extra release.
// This repo had already drifted: package.json said 1.0.1 while the header in
// phyloxml.js still said 1.0.0.
function testVersionsAgree() {
    var pkg = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'package.json'), 'utf8')).version;
    var src = fs.readFileSync(require('path').join(__dirname, '..', 'phyloxml.js'), 'utf8');
    var m = src.match(/^\/\/ v (\d+\.\d+\.\d+)\s*$/m);
    if (!m) {
        console.log('    no "// v X.Y.Z" header found in phyloxml.js');
        return false;
    }
    if (m[1] !== pkg) {
        console.log('    package.json says ' + pkg + ' but phyloxml.js header says ' + m[1]);
        return false;
    }
    return true;
}

// Until 2026-09-17 no clade <date> was written at all: only the phylogeny-level
// one was, so a dated tree read in and written back out lost its whole time
// dimension, silently. Archaeopteryx.js found it by round trip -- 9 dated nodes
// into docs/data/ammonite-time-tree.xml, 0 back out -- while the desktop
// Archaeopteryx had been writing them correctly all along, so the same tree
// saved by the two programs disagreed. This pins the shape they agreed on.
function testCladeDates() {
    var src = [
        '<phyloxml xmlns="http://www.phyloxml.org">',
        ' <phylogeny rooted="true">',
        '  <clade><name>r</name>',
        '   <date unit="mya"><desc>split</desc><value>250.0</value></date>',
        '   <clade><name>a</name>',
        // TreeAnnotator's bounds for a tip it dated EXACTLY: one number twice.
        // A writer must not "tidy" this -- what counts as a genuine width is
        // for whoever DRAWS it to decide, never for whoever stores it.
        '    <date unit="mya"><value>9.0</value><minimum>9.0</minimum>',
        '     <maximum>9.000000000000004</maximum></date>',
        '   </clade>',
        '   <clade><name>b</name><date unit=""><desc>desc only</desc></date></clade>',
        // NO unit attribute at all -- the writer must still emit unit="".
        // The `unit=""` case above does NOT exercise that branch: the reader
        // takes the empty string straight from the file, so the "no unit"
        // default is never reached. Sabotage caught this gap.
        '   <clade><name>e</name><date><value>5</value></date></clade>',
        // every BEAST tip is at height 0, and 0 must not be mistaken for absent
        '   <clade><name>c</name><date unit="year"><value>0</value></date></clade>',
        '   <clade><name>d</name></clade>',
        '  </clade>',
        ' </phylogeny>',
        '</phyloxml>'].join('\n');

    var phy = px.parse(src, {trim: true, normalize: true})[0];
    var out = px.toPhyloXML(phy, 6);

    // the ATTRIBUTE, always written, empty when the date has no unit
    if (out.indexOf('<date unit="mya">') < 0 || out.indexOf('<date unit="">') < 0
        || out.indexOf('<date unit="year">') < 0) {
        console.log('    unit is not always an attribute on <date>');
        return false;
    }
    // the fixed child order: desc, value, minimum, maximum. Another order is
    // schema-INVALID, not merely different.
    // collapse whitespace BETWEEN tags only. Stripping all of it would also
    // eat the space in `<date unit="year">` and no attribute pattern could
    // ever match -- which is exactly what this test did at first.
    var order = out.replace(/>\s+</g, '><');
    if (order.indexOf('<desc>split</desc><value>250</value>') < 0) {
        console.log('    desc/value order wrong or missing');
        return false;
    }
    if (order.indexOf('<value>9</value><minimum>9</minimum><maximum>9.000000000000004</maximum>') < 0) {
        console.log('    value/minimum/maximum order wrong, or the bounds were rounded');
        return false;
    }
    // a node with no date writes no <date>; 0 is a value, not absent
    if ((out.match(/<date/g) || []).length !== 5) {
        console.log('    expected exactly 5 <date> elements, got '
            + (out.match(/<date/g) || []).length);
        return false;
    }
    // a date that arrived with no unit attribute still gets unit=""
    if (order.indexOf('<name>e</name><date unit=""><value>5</value>') < 0) {
        console.log('    a date with no unit did not get unit=""');
        return false;
    }
    if (order.indexOf('<name>e</name><date>') >= 0) {
        console.log('    <date> was written without its unit attribute');
        return false;
    }
    if (order.indexOf('<name>c</name><date unit="year"><value>0</value>') < 0) {
        console.log('    a date value of 0 was dropped');
        return false;
    }

    // and the whole point: it comes back identical
    var back = px.parse(out, {trim: true, normalize: true})[0];
    function dates(n, acc) {
        if (n.date) {
            // An absent unit and unit="" are the same thing -- both are falsy
            // wherever a unit is asked for -- and the desktop always writes the
            // attribute, so a date that arrives WITHOUT one comes back with an
            // empty one. That is inherent to matching their file, and the file
            // is what the two programs must agree on; it is also stable, since
            // writing the re-read tree gives the identical file again. Compared
            // with the unit normalised, so this asserts the values, not that.
            var d = {};
            Object.keys(n.date).forEach(function (k) { d[k] = n.date[k]; });
            if (d.unit === undefined || d.unit === null) {
                d.unit = '';
            }
            acc.push(n.name + ':' + JSON.stringify(d));
        }
        (n.children || []).forEach(function (c) { dates(c, acc); });
        return acc;
    }
    var before = dates(phy, []);
    var after = dates(back, []);
    if (before.length !== 5) {
        console.log('    fixture problem: ' + before.length + ' dated nodes read, expected 5');
        return false;
    }
    if (JSON.stringify(before) !== JSON.stringify(after)) {
        console.log('    round trip changed the dates:\n     in  ' + before.join('\n     in  ')
            + '\n     out ' + after.join('\n     out '));
        return false;
    }
    return true;
}
