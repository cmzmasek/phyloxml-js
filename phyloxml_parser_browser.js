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

'use strict';

const p = phyloXmlParser;

const xml= 
"<?xml version='1.0' encoding='UTF-8'?>\
<phyloxml xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance' xsi:schemaLocation='http://www.phyloxml.org http://www.phyloxml.org/1.10/phyloxml.xsd' xmlns='http://www.phyloxml.org'>\
<phylogeny rooted='true' rerootable='true'>\
  <clade>\
    <name>R</name>\
	<branch_length>1.2</branch_length>\
	<width>0.03</width>\
    <clade>\
      <name>  AB 			 CDE</name>\
	  <branch_length>1E-6</branch_length>\
	  <confidence type='bootstrap'>89</confidence>\
	  <confidence type='probability'>0.99</confidence>\
      <clade branch_length='0.102'>\
        <name>ABC</name>\
        <clade>\
          <name>A</name>\
		    <taxonomy id_source='_A2.2-1'>\
              <id provider='uniprot'>119767</id>\
			  <code>CAPRO</code>\
              <scientific_name>Capensibufo rosei</scientific_name>\
			  <authority>Miller, 1893</authority>\
			  <common_name>toad</common_name>\
			  <common_name>Kröte</common_name>\
			  <synonym>Bufonoidea</synonym>\
			  <synonym>Bufonoideas</synonym>\
              <rank>species</rank>\
			  <uri>http://ebi1.uniprot.org/taxonomy/119767</uri>\
			  <uri desc='does not not work' type='ebi'>http://ebi1.uniprot.org/taxonomy/000000</uri>\
            </taxonomy>\
			<taxonomy>\
              <id provider='uniprot'>95484</id>\
			 </taxonomy>  \
        </clade>\
        <clade>\
          <name>B</name>\
		    <sequence type='protein' id_source='idsource' id_ref='idref'>\
			  <symbol>Bcl-2</symbol>\
			  <accession source='uni_prot'>P10415</accession>\
			  <name>Apoptosis regulator Bcl-2</name>\
			  <gene_name>BCL2</gene_name>\
			  <location>18q21.3</location>\
			  <mol_seq is_aligned='false'>MAHAGRTGYDNREIVMKYIHYKLSQRGYEWDAGDVGAAPPGAAPAPGIFS</mol_seq>\
			  <uri>http://www.uniprot.org/uniprot/P10415</uri>\
			  <annotation ref='GO:0006915'>\
                <desc>apoptotic proces</desc>\
              </annotation>\
              <annotation ref='GO:0051434'>\
                <desc>BH3 domain binding</desc>\
              </annotation>\
              <domain_architecture length='1153'>\
                 <domain from='6' to='90' confidence='4.5E-22'>CARD</domain>\
                 <domain from='110' to='415' confidence='4.0E-119'>NB-ARC</domain>\
              </domain_architecture>\
            </sequence>\
			<sequence type='protein'>\
			  <symbol>Brca1</symbol>\
			</sequence>  \
        </clade>\
        <clade>\
          <name>C</name>\
        </clade>\
      </clade>\
      <clade>\
        <name>D</name>\
      </clade>\
      <clade>\
        <name>E</name>\
      </clade>\
    </clade>\
    <clade>\
      <name>F</name>\
    </clade>\
  </clade>\
</phylogeny>\
</phyloxml>";
console.log('**************the string of xml*************')
 var phys = p.parse(xml, {trim: true, normalize: true});
console.log("************************************");
console.log(phys);
console.log("************************************");
var len = phys.length;
console.log('Parsed ' + len + ' tree:');
window.onload=function(){
	for (var i = 0; i < len; i++) {
	    console.log();
	    console.log('Tree ' + i + ':');
	    var str = JSON.stringify(phys[i], null, 2);
	    document.getElementById('parsed').innerText+=str;
	    //console.log(str);
	}
		//document.getElementById('parsed').innerText=JSON.stringify(phys);
		document.getElementById('xml').innerText= xml;

}
