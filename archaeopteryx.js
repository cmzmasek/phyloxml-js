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
 */

// v 0_37

if (!d3) {
    throw "no d3";
}
(function archaeopteryx() {

    "use strict";

    var TRANSITION_DURATION_DEFAULT = 500;
    var PHYLOGRAM_DEFAULT = false;
    var ROOTOFFSET_DEFAULT = 30;
    var DISPLAY_WIDTH_DEFAULT = 800;
    var VIEWERHEIGHT_DEFAULT = 600;
    var RECENTER_AFTER_COLLAPSE_DEFAULT = false;
    var BRANCH_LENGTH_DIGITS_DEFAULT = 4;
    var CONFIDENCE_VALUE_DIGITS_DEFAULT = 2;
    var ZOOM_INTERVAL = 200;
    var BUTTON_ZOOM_IN_FACTOR = 1.2;
    var BUTTON_ZOOM_OUT_FACTOR = 1 / BUTTON_ZOOM_IN_FACTOR;

    // "Instance variables"
    var _root = null;
    var _svgGroup = null;
    var _baseSvg = null;
    var _tree = null;
    var _superTreeRoots = [];
    var _treeData = null;
    var _options = null;
    var _settings = null;
    var _maxLabelLength = 0;
    var _i = 0;
    var _zoomListener = null;
    var _yScale = null;
    var _foundNodes0 = new Set();
    var _foundNodes1 = new Set();
    var _displayWidth = 0;
    var _displayHeight = 0;
    var _intervalId = 0;
    var _dataForVisualization = {};
    var _currentLabelColorVisualization = null;


    function preOrderTraversal(n, fn) {
        fn(n);
        if (n.children) {
            for (var i = n.children.length - 1; i >= 0; i--) {
                preOrderTraversal(n.children[i], fn)
            }
        }
    }

    function preOrderTraversalX(n, fn) {
        fn(n);
        if (n.children) {
            for (var i = n.children.length - 1; i >= 0; i--) {
                preOrderTraversal(n.children[i], fn)
            }
        }
        else if (n._children) {
            for (var ii = n._children.length - 1; ii >= 0; ii--) {
                preOrderTraversal(n._children[ii], fn)
            }
        }
    }

    function branchLengthScaling(nodes_ary, width) {
        preOrderTraversal(_root, function (n) {
            n.distToRoot = (n.parent ? n.parent.distToRoot : 0) + (n.branch_length || 0);
        });
        var distsToRoot = nodes_ary.map(function (n) {
            return n.distToRoot;
        });
        var yScale = d3.scale.linear()
            .domain([0, d3.max(distsToRoot)])
            .range([0, width]);
        preOrderTraversal(_root, function (n) {
            n.y = yScale(n.distToRoot)
        });
        return yScale;
    }

    function zoom() {
        _svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
    }

    function centerNode(source, x) {
        var scale = _zoomListener.scale();
        if (!x) {
            x = -source.y0;
            x = x * scale + _displayWidth / 2;
        }
        var y = 0;
        d3.select('g').transition()
            .duration(TRANSITION_DURATION_DEFAULT)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        _zoomListener.scale(scale);
        _zoomListener.translate([x, y]);
    }

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        }
        else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    function click(d) {
        if (d3.event.defaultPrevented || !d.parent || !d.parent.parent) {
            return;
        }
        d = toggleChildren(d);
        update(d);
        if (_settings.reCenterAfterCollapse) {
            centerNode(d);
        }
    }


    function update(source, transitionDuration) {

        if (!source) {
            source = _root;
        }
        if (transitionDuration === undefined) {
            transitionDuration = TRANSITION_DURATION_DEFAULT;
        }

        var nodes_ary = _tree(_treeData);

        _tree = _tree.size([_displayHeight, _displayWidth - (_settings.rootOffset + _maxLabelLength * 10)]);

        _tree = _tree.separation(function separation(a, b) {
            return a.parent == b.parent ? 1 : 1;
        });

        var nodes = _tree.nodes(_root).reverse();
        var links = _tree.links(nodes);

        var w = _displayWidth - (_settings.rootOffset + _maxLabelLength * 10);
        if (_options.phylogram === true) {
            _yScale = branchLengthScaling(nodes_ary, w);
        }
        else {
            d3.scale.linear()
                .domain([0, w])
                .range([0, w]);
        }

        var node = _svgGroup.selectAll("g.node")
            .data(nodes, function (d) {
                return d.id || (d.id = ++_i);
            });

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function () {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .style("cursor", "default")
            .on('click', _tree.clickEvent);

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0);

        nodeEnter.append("circle")
            .style("cursor", "pointer")
            .style("opacity", "0")
            .attr('class', 'nodeCircleOptions')
            .attr("r", 5);

        nodeEnter.append("text")
            .attr("class", "extlabel")
            .attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            })
            // .style("fill", makeLabelColor)
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .style("fill-opacity", 0.5);

        nodeEnter.append("text")
            .attr("class", "bllabel");

        nodeEnter.append("text")
            .attr("class", "conflabel")
            .attr("text-anchor", "middle");

        node.select("text.extlabel")
            .style("font-size", function (d) {
                return d.children || d._children ? _options.internalNodeFontSize + "px" : _options.externalNodeFontSize + "px"
            })
            .style("fill", makeLabelColor)
            .attr("y", function (d) {
                return d.children || d._children ? 0.3 * _options.internalNodeFontSize : 0.3 * _options.externalNodeFontSize
            });

        node.select("text.bllabel")
            .style("font-size", _options.branchDataFontSize + "px")
            .attr("dy", "-.25em")
            .attr("x", function (d) {
                if (d.parent) {
                    return (d.parent.y - d.y + 1);
                }
                else {
                    return 0;
                }
            });

        node.select("text.conflabel")
            .style("font-size", _options.branchDataFontSize + "px")
            .attr("dy", _options.branchDataFontSize)
            .attr("x", function (d) {
                if (d.parent) {
                    return (0.5 * (d.parent.y - d.y) );
                }
                else {
                    return 0;
                }
            });


        node.select("circle.nodeCircle")

            .attr("r", function (d) {
                return ( ( _options.internalNodeSize > 0 && d.parent )
                &&
                (
                    ( ( d._children || d.children ) && _options.showInternalNodes  )

                    ||
                    ( ( !d._children && !d.children ) && _options.showExternalNodes  )

                ) ) ? _options.internalNodeSize : 0;
            })
            .style("stroke", makeNodeColor)
            .style("stroke-width", _options.branchWidthDefault)
            .style("fill", function (d) {
                return d._children ? makeNodeColor(d) : _options.backgroundColorDefault;
            });

        var nodeUpdate = node.transition()
            .duration(transitionDuration)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        nodeUpdate.select("text.extlabel")
            .text(makeExtNodeLabel);

        nodeUpdate.select("text.bllabel")
            .text(_options.showBranchLengthValues ? makeBranchLengthLabel : null);

        nodeUpdate.select("text.conflabel")
            .text(_options.showConfidenceValues ? makeConfidenceValuesLabel : null);

        var nodeExit = node.exit().transition()
            .duration(0)
            .attr("transform", function () {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        var link = _svgGroup.selectAll("path.link")
            .attr("d", elbow)
            .attr("stroke-width", makeBranchWidth)
            .data(links, function (d) {
                return d.target.id;
            });

        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("stroke-width", makeBranchWidth)
            .attr("stroke", makeBranchColor)
            .attr("d", function () {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return elbow({
                    source: o,
                    target: o
                });
            });

        link.transition()
            .duration(transitionDuration)
            .attr("d", elbow);

        link.exit().transition()
            .duration(transitionDuration)
            .attr("d", function () {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return elbow({
                    source: o,
                    target: o
                });
            })
            .remove();

        nodes.forEach(function (d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    var makeBranchWidth = function (link) {
        if (link.target.width) {
            return link.target.width;
        }
        return _options.branchWidthDefault;
    };

    var makeBranchColor = function (link) {
        if (link.target.color) {
            var c = link.target.color;
            return "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
        }
        return _options.branchColorDefault;
    };

    var makeNodeColor = function (phynode) {
        if (_foundNodes0 && _foundNodes1 && _foundNodes0.has(phynode) && _foundNodes1.has(phynode)) {
            return _options.found0and1ColorDefault;
        }
        else if (_foundNodes0 && _foundNodes0.has(phynode)) {
            return _options.found0ColorDefault;
        }
        else if (_foundNodes1 && _foundNodes1.has(phynode)) {
            return _options.found1ColorDefault;
        }
        else if (phynode.color) {
            var c = phynode.color;
            return "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
        }
        return _options.branchColorDefault;
    };

    var makeLabelColor = function (phynode) {
        if (_foundNodes0 && _foundNodes1 && _foundNodes0.has(phynode) && _foundNodes1.has(phynode)) {
            return _options.found0and1ColorDefault;
        }
        else if (_foundNodes0 && _foundNodes0.has(phynode)) {
            return _options.found0ColorDefault;
        }
        else if (_foundNodes1 && _foundNodes1.has(phynode)) {
            return _options.found1ColorDefault;
        }

        if (_currentLabelColorVisualization) {
            var color = labelColorVisualization(phynode);
            if (color) {
                return color;
            }
        }
        if (phynode.color) {
            var c = phynode.color;
            return "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
        }
        return _options.labelColorDefault;
    };


    function labelColorVisualization(node) {
        var distColors = {};
        distColors.CA = "rgb(0,0,255)";
        distColors.AZ = "rgb(0,255,255)";
        distColors.NY = "rgb(255,0,255)";
        distColors.MN = "rgb(100,0,255)";
        distColors.FL = "rgb(100,0,100)";
        distColors.IL = "rgb(100,100,100)";
        distColors.IL = "rgb(100,0,125)";

        var drugColors = {};
        drugColors.Amantadine = "rgb(0,0,255)";
        drugColors.Docosanol = "rgb(0,255,0)";
        drugColors.Emtricitabin = "rgb(255,0,0)";

        var hostColors = {};
        hostColors["Gallus gallus"] = "rgb(129,20,0)";
        hostColors["Anas platyrhynchos"] = "rgb(93,40,255)";
        hostColors["Sus scrofa"] = "rgb(10,129,23)";

        if (_currentLabelColorVisualization === "distribution") {
            if (node.distributions && node.distributions.length > 0) {
                return distColors[node.distributions[0].desc];
            }
        }
        else if (_currentLabelColorVisualization === "vipr:host"
            || _currentLabelColorVisualization === "vipr:drug") {
            if (node.properties && node.properties.length > 0) {
                var propertiesLength = node.properties.length;
                for (var i = 0; i < propertiesLength; ++i) {
                    var p = node.properties[i];
                    if (p.ref && p.value) {
                        var ref = p.ref;
                        if (_currentLabelColorVisualization === "vipr:host" && ref === "vipr:host") {
                            return hostColors[p.value];
                        }
                        else if (_currentLabelColorVisualization === "vipr:drug" && ref === "vipr:drug") {
                            return drugColors[p.value];
                        }
                    }
                }
            }
        }
        return null;
    }


    var _dynahide_counter = 0;
    var _dynahide_factor = 3;

    var makeExtNodeLabel = function (phynode) {

        if (!_options.showExternalLabels && !phynode.children) {
            return null;
        }
        if (!_options.showInternalLabels && phynode.children) {
            return null;
        }

        if (_options.dynahide && !phynode.children) {
            if (++_dynahide_counter % _dynahide_factor !== 0) {
                console.log("c=" + _dynahide_counter);
                return null;
            }
        }

        var l = "";
        if (_options.showNodeName) {
            l = append(l, phynode.name);
        }
        if (_options.showTaxonomy && phynode.taxonomies && phynode.taxonomies.length > 0) {
            var t = phynode.taxonomies[0];
            if (_options.showTaxonomyCode) {
                l = append(l, t.code);
            }
            if (_options.showTaxonomyScientificName) {
                l = append(l, t.scientific_name);
            }
            if (_options.showTaxonomyCommonName) {
                l = appendP(l, t.common_name);
            }
            if (_options.showTaxonomyRank) {
                l = appendP(l, t.rank);
            }
            if (_options.showTaxonomySynonyms) {
                if (t.synonyms && t.synonyms.length > 0) {
                    var s = t.synonyms;
                    for (var i = 0; i < s.length; ++i) {
                        l = appendB(l, s[i]);
                    }
                }
            }
        }
        if (_options.showSequence && phynode.sequences && phynode.sequences.length > 0) {
            var s = phynode.sequences[0];
            if (_options.showSequenceSymbol) {
                l = append(l, s.symbol);
            }
            if (_options.showSequenceName) {
                l = append(l, s.name);
            }
            if (_options.showSequenceGeneSymbol) {
                l = appendP(l, s.gene_name);
            }
        }
        if (_options.showDistributions && phynode.distributions && phynode.distributions.length > 0) {
            var d = phynode.distributions;
            for (var i = 0; i < d.length; ++i) {
                l = appendB(l, d[i].desc);
            }
        }
        //console.log(l);
        return l;
    };

    var append = function (str1, str2) {
        if (str2 && str2.length > 0) {
            if (str1.length > 0) {
                str1 += ( " " + str2 );
            }
            else {
                str1 = str2;
            }
        }
        return str1;
    };
    var appendP = function (str1, str2) {
        if (str2 && str2.length > 0) {
            if (str1.length > 0) {
                str1 += ( " (" + str2 + ")");
            }
            else {
                str1 = "(" + str2 + ")";
            }
        }
        return str1;
    };
    var appendB = function (str1, str2) {
        if (str2 && str2.length > 0) {
            if (str1.length > 0) {
                str1 += ( " [" + str2 + "]");
            }
            else {
                str1 = "[" + str2 + "]";
            }
        }
        return str1;
    };

    var makeBranchLengthLabel = function (phynode) {
        if (phynode.branch_length && phynode.branch_length != 0) {
            if (_options.minBranchLengthValueToShow && phynode.branch_length < _options.minBranchLengthValueToShow) {
                return;
            }
            return +phynode.branch_length.toFixed(BRANCH_LENGTH_DIGITS_DEFAULT);
        }
        return;
    };

    var makeConfidenceValuesLabel = function (phynode) {
        if (phynode.confidences && phynode.confidences.length > 0) {
            var c = phynode.confidences;
            var cl = c.length;

            if (_options.minConfidenceValueToShow) {
                var show = false;
                for (var i = 0; i < cl; ++i) {
                    if (c[i].value >= _options.minConfidenceValueToShow) {
                        show = true;
                        break;
                    }
                }
                if (!show) {
                    return;
                }
            }
            if (cl == 1) {
                if (c[0].value) {
                    return +c[0].value.toFixed(CONFIDENCE_VALUE_DIGITS_DEFAULT);
                }
            }
            else {
                var s = "";
                for (var i = 0; i < cl; ++i) {
                    if (c[i].value) {
                        if (i > 0) {
                            s += "/";
                        }
                        s += +c[i].value.toFixed(CONFIDENCE_VALUE_DIGITS_DEFAULT);
                    }
                }
                return s;
            }
        }
        return;
    };

    var elbow = function (d) {
        return "M" + d.source.y + "," + d.source.x
            + "V" + d.target.x + "H" + d.target.y;
    };


    function initializeOptions(options) {
        _options = options ? options : {};
        if (_options.phylogram === undefined) {
            _options.phylogram = PHYLOGRAM_DEFAULT;
        }
        if (_options.dynahide === undefined) {
            _options.dynahide = false;
        }
        if (_options.showBranchLengthValues === undefined) {
            _options.showBranchLengthValues = false;
        }
        if (_options.showConfidenceValues === undefined) {
            _options.showConfidenceValues = false;
        }
        if (_options.showNodeName === undefined) {
            _options.showNodeName = false;
        }
        if (_options.showTaxonomy === undefined) {
            _options.showTaxonomy = false;
        }
        if (_options.showTaxonomyCode === undefined) {
            _options.showTaxonomyCode = false;
        }
        if (_options.showTaxonomyScientificName === undefined) {
            _options.showTaxonomyScientificName = false;
        }
        if (_options.showTaxonomyCommonName === undefined) {
            _options.showTaxonomyCommonName = false;
        }
        if (_options.showTaxonomyRank === undefined) {
            _options.showTaxonomyRank = false;
        }
        if (_options.showTaxonomySynonyms === undefined) {
            _options.showTaxonomySynonyms = false;
        }
        if (_options.showSequence === undefined) {
            _options.showSequence = false;
        }
        if (_options.showSequenceSymbol === undefined) {
            _options.showSequenceSymbol = false;
        }
        if (_options.showSequenceName === undefined) {
            _options.showSequenceName = false;
        }
        if (_options.showSequenceGeneSymbol === undefined) {
            _options.showSequenceGeneSymbol = false;
        }
        if (_options.showDistributions === undefined) {
            _options.showDistributions = false;
        }
        if (_options.showInternalNodes === undefined) {
            _options.showInternalNodes = false;
        }
        if (_options.showExternalNodes === undefined) {
            _options.showExternalNodes = false;
        }
        if (_options.showInternalLabels === undefined) {
            _options.showInternalLabels = false;
        }
        if (_options.showExternalLabels === undefined) {
            _options.showExternalLabels = false;
        }
        if (!_options.branchWidthDefault) {
            _options.branchWidthDefault = 2;
        }
        if (!_options.branchColorDefault) {
            _options.branchColorDefault = "#aaaaaa";
        }
        if (!_options.labelColorDefault) {
            _options.labelColorDefault = "#202020";
        }
        if (!_options.backgroundColorDefault) {
            _options.backgroundColorDefault = "#f0f0f0";
        }
        if (!_options.found0ColorDefault) {
            _options.found0ColorDefault = "#00ff00";
        }
        if (!_options.found1ColorDefault) {
            _options.found1ColorDefault = "#ff0000";
        }
        if (!_options.found0and1ColorDefault) {
            _options.found0and1ColorDefault = "#00ffff";
        }
        if (!_options.internalNodeSize) {
            _options.internalNodeSize = 3;
        }
        if (!_options.externalNodeFontSize) {
            _options.externalNodeFontSize = 10;
        }
        if (!_options.internalNodeFontSize) {
            _options.internalNodeFontSize = 9;
        }
        if (!_options.branchDataFontSize) {
            _options.branchDataFontSize = 7;
        }
        if (!_options.minBranchLengthValueToShow) {
            _options.minBranchLengthValueToShow = null;
        }
        if (_options.minConfidenceValueToShow === undefined) {
            _options.minConfidenceValueToShow = null;
        }
        if (_options.searchIsCaseSensitive === undefined) {
            _options.searchIsCaseSensitive = false;
        }
        if (_options.searchIsPartial === undefined) {
            _options.searchIsPartial = true;
        }
        if (_options.searchUsesRegex === undefined) {
            _options.searchUsesRegex = false;
        }

    }

    function initializeSettings(settings) {
        _settings = settings ? settings : {};
        if (!_settings.rootOffset) {
            _settings.rootOffset = ROOTOFFSET_DEFAULT;
        }
        if (!_settings.displayWidth) {
            _settings.displayWidth = DISPLAY_WIDTH_DEFAULT;
        }
        if (!_settings.displayHeight) {
            _settings.displayHeight = VIEWERHEIGHT_DEFAULT;
        }
        if (!_settings.reCenterAfterCollapse) {
            _settings.reCenterAfterCollapse = RECENTER_AFTER_COLLAPSE_DEFAULT;
        }
        intitialzeDisplaySize();
    }

    function intitialzeDisplaySize() {
        _displayHeight = _settings.displayHeight;
        _displayWidth = _settings.displayWidth;
    }

    archaeopteryx.launch = function (id, phylo, options, settings) {
        _treeData = phylo;
        _zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);
        initializeOptions(options);
        initializeSettings(settings);

        _baseSvg = d3.select(id).append("svg")
            .attr("width", _displayWidth)
            .attr("height", _displayHeight)
            .attr("class", "overlay")
            .call(_zoomListener);

        _svgGroup = _baseSvg.append("g");

        _tree = d3.layout.cluster()
            .size([_displayHeight, _displayWidth]);

        _tree.clickEvent = getClickEventListenerNode(phylo); //TODO

        calculateMaxExtLabel();

        _root = phylo;
        _root.x0 = _displayHeight / 2;
        _root.y0 = 0;

        collectDataForVisualization();

        initializeGui();
        update(null, 0);
        centerNode(_root, _settings.rootOffset);
    };

    function collectDataForVisualization() {
        preOrderTraversal(_treeData, function (node) {
            if (node.properties && node.properties.length > 0) {
                var propertiesLength = node.properties.length;
                for (var i = 0; i < propertiesLength; ++i) {
                    var p = node.properties[i];
                    if (p.ref && p.value) {
                        var ref = p.ref;
                        if (!_dataForVisualization[ref]) {
                            _dataForVisualization[ref] = new Set();
                        }
                        _dataForVisualization[ref].add(p.value);
                    }
                }
            }
            if (node.distributions && node.distributions.length > 0) {
                var distributionsLength = node.distributions.length;
                for (var i = 0; i < distributionsLength; ++i) {
                    var d = node.distributions[i];
                    var desc = d.desc;
                    if (desc) {
                        if (!_dataForVisualization.distribution) {
                            _dataForVisualization.distribution = new Set();
                        }
                        _dataForVisualization.distribution.add(desc);
                    }
                }
            }
        });
    }


    function calculateMaxExtLabel() {
        _maxLabelLength = 1;
        preOrderTraversal(_treeData, function (d) {
            var l = makeExtNodeLabel(d);
            if (l) {
                _maxLabelLength = Math.max(l.length, _maxLabelLength);
            }
        });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////


    function removeTooltips() {
        _svgGroup.selectAll(".tooltipElem").remove();
    }


    function getChildren(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }


    function getClickEventListenerNode(tree) {

        function nodeClick(d) {

            function displayNodeData(n) {

                var title = n.name ? "Node Data: " + n.name : "Node Data";
                var text = "";
                if (n.name) {
                    text += "Name: " + n.name + "<br>";
                }
                if (n.branch_length) {
                    text += "Distance to Parent: " + n.branch_length + "<br>";
                }
                if (n.confidences) {
                    for (var i = 0; i < n.confidences.length; ++i) {
                        var c = n.confidences[i];
                        if (c.type) {
                            text += "Confidence [" + c.type + "]: " + c.value + "<br>";
                        }
                        else {
                            text += "Confidence: " + c.value + "<br>";
                        }
                        if (c.stddev) {
                            text += "- stdev: " + c.stddev + "<br>";
                        }
                    }
                }
                if (n.taxonomies) {
                    for (var i = 0; i < n.taxonomies.length; ++i) {
                        text += "Taxonomy<br>";
                        var t = n.taxonomies[i];
                        if (t.id) {
                            if (t.id.provider) {
                                text += "- Id [" + t.id.provider + "]: " + t.id.value + "<br>";
                            }
                            else {
                                text += "- Id: " + t.id.value + "<br>";
                            }
                        }
                        if (t.code) {
                            text += "- Code: " + t.code + "<br>";
                        }
                        if (t.scientific_name) {
                            text += "- Scientific name: " + t.scientific_name + "<br>";
                        }
                        if (t.common_name) {
                            text += "- Common name: " + t.common_name + "<br>";
                        }
                        if (t.synonym) {
                            text += "- Synonym: " + t.synonym + "<br>";
                        }
                        if (t.rank) {
                            text += "- Rank: " + t.rank + "<br>";
                        }
                    }
                }
                if (n.sequences) {
                    for (var i = 0; i < n.sequences.length; ++i) {
                        text += "Sequence<br>";
                        var s = n.sequences[i];
                        if (s.accession) {
                            if (s.accession.source) {
                                text += "- Accession [" + s.accession.source + "]: " + s.accession.value + "<br>";
                            }
                            else {
                                text += "- Accession: " + s.accession.value + "<br>";
                            }
                            if (s.accession.comment) {
                                text += "-- comment: " + s.accession.commen + "<br>";
                            }
                        }
                        if (s.symbol) {
                            text += "- Symbol: " + s.symbol + "<br>";
                        }
                        if (s.name) {
                            text += "- Name: " + s.name + "<br>";
                        }
                        if (s.gene_name) {
                            text += "- Gene name: " + s.gene_name + "<br>";
                        }
                        if (s.location) {
                            text += "- Location: " + s.location + "<br>";
                        }
                        if (s.type) {
                            text += "- Type: " + s.type + "<br>";
                        }
                    }
                }
                if (n.distributions) {
                    var distributions = n.distributions;
                    for (var i = 0; i < distributions.length; ++i) {
                        text += "Distribution: ";
                        if (distributions[i].desc) {
                            text += distributions[i].desc + "<br>";
                        }
                    }
                }
                if (n.date) {
                    text += "Date: ";
                    var date = n.date;
                    if (date.desc) {
                        text += date.desc + "<br>";
                    }
                }
                if (n.properties && n.properties.length > 0) {
                    var propertiesLength = n.properties.length;
                    for (var i = 0; i < propertiesLength; ++i) {
                        var property = n.properties[i];
                        if (property.ref && property.value) {
                            if (property.unit) {
                                text +=  property.ref + ": " + property.value + property.unit + "<br>";
                            }
                            else {
                                text +=  property.ref + ": " + property.value + "<br>";
                            }
                        }
                    }
                }

                $("<div id='node_data'>" + text + "</div>").dialog();
                var dialog = $("#node_data");
                dialog.dialog("option", "modal", true);
                dialog.dialog("option", "title", title);
                update();
            }

            function goToSubTree(node) {
                if (node.parent && node.children) {
                    if (node === _root && _superTreeRoots.length > 0) {
                        _root = _superTreeRoots.pop();
                        console.log("goToSubTree: <--");
                        update(_root);
                        zoomFit();
                    }
                    else if (node.parent.parent) {
                        _superTreeRoots.push(_root);
                        _root = node;
                        console.log("goToSubTree: -->");
                        update(_root);
                        zoomFit();
                    }
                }
            }

            function swapChildren(d) {
                var c = d.children;
                var l = c.length;
                if (l > 1) {
                    var first = c[0];
                    for (var i = 0; i < l - 1; ++i) {
                        c[i] = c[i + 1];
                    }
                    c[l - 1] = first;
                    update(d);
                }
            }

            function calcExternalNodes(node) {
                if (!node.children) {
                    return 1;
                }
                var c = node.children;
                var l = c.length;
                var cc = 0;
                for (var i = 0; i < l; ++i) {
                    cc += calcExternalNodes(c[i]);
                }
                return cc;
            }

            function orderSubtree(n, order) {
                var changed = false;
                ord(n);
                if (!changed) {
                    order = !order;
                    ord(n);
                }
                function ord(n) {
                    if (!n.children) {
                        return;
                    }
                    var c = n.children;
                    var l = c.length;
                    if (l == 2) {
                        var e0 = calcExternalNodes(c[0]);
                        var e1 = calcExternalNodes(c[1]);
                        if (e0 !== e1 && e0 < e1 === order) {
                            changed = true;
                            var c0 = c[0];
                            c[0] = c[1];
                            c[1] = c0;
                        }
                    }
                    for (var i = 0; i < l; ++i) {
                        ord(c[i]);
                    }
                }

                update(n);
            }

            function collapse(d) {
                if (d.children) {
                    d._children = d.children;
                    d.children = null;
                }
                else {
                    d.children = d._children;
                    d._children = null;
                }
                update(d);
            }

            function unCollapseAll(root) {
                preOrderTraversal(root, function (d) {
                    if (d._children) {
                        d.children = d._children;
                        d._children = null;
                    }
                });
                update();
            }

            function reRoot2(tree, d) {
                reRoot(tree, d, -1);
                update();
            }

            var rectWidth = 120;
            var rectHeight = 130;

            removeTooltips();

            d3.select(this).append("rect")
                .attr("class", "tooltipElem")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", rectWidth)
                .attr("height", rectHeight)
                .attr("rx", 10)
                .attr("ry", 10)
                .style("fill-opacity", 0.9)
                .style("fill", "#606060");

            var rightPad = 10;
            var topPad = 20;
            var textSum = 0;
            var textInc = 20;

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    if (d.parent) {
                        textSum += textInc;
                        return "Display Node Data";
                    }
                })
                .on("click", function (d) {
                    displayNodeData(d);
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    if (d.parent && d.parent.parent) {
                        if (d._children) {
                            textSum += textInc;
                            return "Uncollapse";
                        }
                        else if (d.children) {
                            textSum += textInc;
                            return "Collapse";
                        }
                    }
                })
                .on("click", function (d) {
                    collapse(d);
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    var cc = 0;
                    preOrderTraversalX(d, function (e) {
                        if (e._children) {
                            ++cc;
                        }
                    });
                    if (cc > 1 || ( cc == 1 && !d._children )) {
                        textSum += textInc;
                        return "Uncollapse All";
                    }
                })
                .on("click", function (d) {
                    unCollapseAll(d, true);
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    if (d.parent && d.children) {
                        if (d === _root && _superTreeRoots.length > 0) {
                            textSum += textInc;
                            return "Return to Super-tree";
                        }
                        else if (d.parent.parent) {
                            textSum += textInc;
                            return "Go to Sub-tree";
                        }
                    }

                })
                .on("click", function (d) {
                    goToSubTree(d);
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    if (d.parent) {
                        if (d.children) {
                            textSum += textInc;
                            return "Swap Descendants";
                        }
                    }
                })
                .on("click", function (d) {
                    swapChildren(d);
                    update();
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    if (d.parent) {
                        if (d.children) {
                            textSum += textInc;
                            return "Order Subtree";
                        }
                    }
                })
                .on("click", function (d) {
                    if (!_tree.visData) {
                        _tree.visData = {};
                    }
                    if (_tree.visData.order === undefined) {
                        _tree.visData.order = true;
                    }
                    orderSubtree(d, _tree.visData.order);
                    _tree.visData.order = !_tree.visData.order;
                    update();
                });

            d3.select(this).append("text")
                .attr("class", "tooltipElem tooltipElemText")
                .attr("y", topPad + textSum)
                .attr("x", +rightPad)
                .style("fill", "white")
                .style("font-weight", "bold")
                .text(function (d) {
                    if (d.parent && d.parent.parent && _superTreeRoots.length < 1) {
                        textSum += textInc;
                        return "Reroot";
                    }
                })
                .on("click", function (d) {
                    reRoot2(tree, d);
                    update();
                });

            d3.selection.prototype.moveToFront = function () {
                return this.each(function () {
                    this.parentNode.appendChild(this);
                });
            };
            d3.select(this).moveToFront();
            d3.select(this).selectAll(".tooltipElemText").each(function (d) {
                d3.select(this).on("mouseover", function (d) {
                    d3.select(this).transition().duration(50).style("fill", "black");
                });
                d3.select(this).on("mouseout", function (d) {
                    d3.select(this).transition().duration(50).style("fill", "white");
                });
            });

        }

        return nodeClick;
    }


    $('html').click(function (d) {
        if ((d.target.getAttribute("class") !== "nodeCircleOptions")) {
           removeTooltips();
        }
    });

    $(function () {
        $("#node_size_slider").slider({
            min: 0,
            max: 8,
            slide: changeNodeSize,
            change: changeNodeSize
        });
    });

    $(function () {
        $("#branch_width_slider").slider({
            min: 1,
            max: 9,
            slide: changeBranchWidth,
            change: changeBranchWidth
        });
    });

    $(function () {
        $("#external_font_size_slider").slider({
            min: 2,
            max: 24,
            slide: changeExternalFontSize,
            change: changeExternalFontSize
        });
    });
    $(function () {
        $("#internal_font_size_slider").slider({
            min: 2,
            max: 24,
            slide: changeInternalFontSize,
            change: changeInternalFontSize
        });
    });
    $(function () {
        $("#branch_data_font_size_slider").slider({
            min: 2,
            max: 24,
            slide: changeBranchDataFontSize,
            change: changeBranchDataFontSize
        });
    });

    $(function () {
        $("input:text")
            .button()
            .off('keydown')
            .off('mouseenter')
            .off('mousedown')
            .css({
                'font': 'inherit',
                'color': 'inherit',
                'text-align': 'left',
                'outline': 'none',
                'cursor': 'text',
                'width': '44px'
            });
    });


    $(function () {
        $("input:button")
            .button()
            .css({
                'width': '28px',
                'text-align': 'center',
                'outline': 'none',
                'margin': '1px'
            });
    });


    $(function () {
        $("#zoom_in_y, #zoom_out_y")
            .css({
                'width': '94px'
            });
    });


    $(function () {
        $("#zoom_in_y").mousedown(function () {
            zoomInY();
            _intervalId = setInterval(zoomInY, ZOOM_INTERVAL);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(_intervalId);
        });
    });

    $(function () {
        $("#zoom_out_y").mousedown(function () {
            zoomOutY();
            _intervalId = setInterval(zoomOutY, ZOOM_INTERVAL);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(_intervalId);
        });
    });


    $(function () {
        $("#zoom_in_x").mousedown(function () {
            zoomInX();
            _intervalId = setInterval(zoomInX, ZOOM_INTERVAL);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(_intervalId);
        });
    });

    $(function () {
        $("#zoom_out_x").mousedown(function () {
            zoomOutX();
            _intervalId = setInterval(zoomOutX, ZOOM_INTERVAL);
        }).bind('mouseup mouseleave', function () {
            clearTimeout(_intervalId);
        });
    });

    $(function () {
        $("#zoom_to_fit").mousedown(zoomFit);
    });

    function zoomInX() {
        _displayWidth = _displayWidth * BUTTON_ZOOM_IN_FACTOR;
        update(null, 0);
    }

    function zoomInY() {
        _displayHeight = _displayHeight * BUTTON_ZOOM_IN_FACTOR;
        update(null, 0);
    }

    function zoomOutX() {
        _displayWidth = _displayWidth * BUTTON_ZOOM_OUT_FACTOR;
        var min = 0.75 * ( _settings.displayWidth - _maxLabelLength - _settings.rootOffset );
        if (_displayWidth < min) {
            _displayWidth = min;
        }
        update(null, 0);
    }

    function zoomOutY() {
        _displayHeight = _displayHeight * BUTTON_ZOOM_OUT_FACTOR;
        var min = 0.25 * _settings.displayHeight;
        if (_displayHeight < min) {
            _displayHeight = min;
        }
        update(null, 0);
    }

    function zoomFit() {
        calculateMaxExtLabel();
        intitialzeDisplaySize();
        initializeSettings(_settings);
        _zoomListener.scale(1);
        update(null, 0);
        centerNode(_root, _settings.rootOffset);
    }

    $(function () {
        $(":radio").checkboxradio({
            icon: false
        });
        $(":checkbox").checkboxradio({
            icon: false
        });

    });

    $(function () {
        $("#search0").keyup(search0);
    });
    $(function () {
        $("#search1").keyup(search1);
    });


    $(function () {
        $("#radio-phylogram").click(toPhylogram);
    });

    $(function () {
        $("#radio-cladogram").click(toCladegram);
    });

    $(function () {
        $("#node_name_cb").click(nodeNameCbClicked);
    });

    $(function () {
        $("#taxonomy_cb").click(taxonomyCbClicked);
    });

    $(function () {
        $("#sequence_cb").click(sequenceCbClicked);
    });

    $(function () {
        $("#confidence_values_cb").click(confidenceValuesCbClicked);
    });

    $(function () {
        $("#branch_length_values_cb").click(branchLengthsCbClicked);
    });

    $(function () {
        $("#internal_label_cb").click(internalLabelsCbClicked);
    });

    $(function () {
        $("#external_label_cb").click(externalLabelsCbClicked);
    });
    $(function () {
        $("#internal_nodes_cb").click(internalNodesCbClicked);
    });
    $(function () {
        $("#external_nodes_cb").click(externalNodesCbClicked);
    });


    $(function () {
        $("#label_color_select_menu").on("change", function () {
            var v = this.value;
            if (v && v != "none") {
                _currentLabelColorVisualization = v;
                var x = _dataForVisualization[v];
            }
            else {
                _currentLabelColorVisualization = null;
            }
            update(null, 0);
        });
    });


    function search0() {
        _foundNodes0.clear();
        var query = $("#search0").val();
        if (query && query.length > 0) {
            _foundNodes0 = search(query);
        }
        update();
    }

    function search1() {
        _foundNodes1.clear();
        var query = $("#search1").val();
        if (query && query.length > 0) {
            _foundNodes1 = search(query);
        }
        update();
    }

    function search(query) {
        var r = searchData(query,
            _treeData,
            _options.searchIsCaseSensitive,
            _options.searchIsPartial,
            _options.searchUsesRegex);
        return r;
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////////

    function searchData(query,
                        phy,
                        caseSensitive,
                        partial,
                        regex) {
        var nodes = new Set();
        if (!phy || !query || query.length < 1) {
            return nodes;
        }
        var my_query = query.trim();
        if (my_query.length < 1) {
            return nodes;
        }
        my_query = my_query.replace(/\s\s+/g, ' ');

        if (!regex) {
            my_query = my_query.replace(/\+\++/g, '+');
        }

        var queries = [];

        if (!regex && ( my_query.indexOf(",") >= 0 )) {
            queries = my_query.split(",");
        }
        else {
            queries.push(my_query);
        }
        var queriesLength = queries.length;

        for (var i = 0; i < queriesLength; ++i) {
            var q = queries[i];
            if (q) {
                q = q.trim();
                if (q.length > 0) {
                    preOrderTraversal(_treeData, matcher);
                }
            }
        }

        return nodes;

        function matcher(node) {
            var mqueries = [];
            if (!regex && ( q.indexOf("+") >= 0 )) {
                mqueries = q.split("+");
            }
            else {
                mqueries.push(q);
            }
            var mqueriesLength = mqueries.length;
            var match = true;
            for (var i = 0; i < mqueriesLength; ++i) {
                var mq = mqueries[i];
                if (mq) {
                    mq = mq.trim();
                    if (mq.length > 0) {
                        var ndf = null;
                        if (( mq.length > 3 ) && ( mq.indexOf(":") === 2 )) {
                            ndf = makeNDF(mq);
                            if (ndf) {
                                mq = mq.substring(3);
                            }
                        }
                        var lmatch = false;
                        if (( ( ndf === null ) || ( ndf === "NN" ) )
                            && matchme(node.name, mq, caseSensitive, partial, regex)) {
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "TC" ) ) && node.taxonomies
                            && node.taxonomies.length > 0
                            && matchme(node.taxonomies[0].code,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("TC");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "TS" ) ) && node.taxonomies
                            && node.taxonomies.length > 0
                            && matchme(node.taxonomies[0].scientific_name,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("TS");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "TN" ) ) && node.taxonomies
                            && node.taxonomies.length > 0
                            && matchme(node.taxonomies[0].common_name,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("TN");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "SY" ) ) && node.taxonomies
                            && node.taxonomies.length > 0
                            && matchme(node.taxonomies[0].synonym,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("SY");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "TI" ) ) && node.taxonomies
                            && node.taxonomies.length > 0 && node.taxonomies[0].id
                            && matchme(node.taxonomies[0].id.value,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("TI");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "SN" ) ) && node.sequences
                            && node.sequences.length > 0
                            && matchme(node.sequences[0].name,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("SN");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "GN" ) ) && node.sequences
                            && node.sequences.length > 0
                            && matchme(node.sequences[0].gene_name,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("GN");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "SS" ) ) && node.sequences
                            && node.sequences.length > 0
                            && matchme(node.sequences[0].symbol,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("SS");
                            lmatch = true;
                        }
                        else if (( ( ndf === null ) || ( ndf === "SA" ) ) && node.sequences
                            && node.sequences.length > 0 && node.sequences[0].accession
                            && matchme(node.sequences[0].accession.value,
                                mq,
                                caseSensitive,
                                partial,
                                regex)) {
                            console.log("SA");
                            lmatch = true;
                        }
                        if (!lmatch) {
                            match = false;
                            break;
                        }

                    } // if (mq.length > 0)
                    else {
                        match = false;
                    }
                } // if (mq)
                else {
                    match = false;
                }
            } //  for (var i = 0; i < mqueriesLength; ++i)
            if (match) {
                nodes.add(node);
            }
        }

        function matchme(s,
                         query,
                         caseSensitive,
                         partial,
                         regex) {
            if (!s || !query) {
                return false;
            }
            var my_s = s.trim();
            var my_query = query.trim();
            if (!caseSensitive && !regex) {
                my_s = my_s.toLowerCase();
                my_query = my_query.toLowerCase();
            }
            if (regex) {
                var re = null;
                try {
                    if (caseSensitive) {
                        re = new RegExp(my_query);
                    }
                    else {
                        re = new RegExp(my_query, 'i');
                    }
                }
                catch (err) {
                    return false;
                }
                if (re) {
                    return ( my_s.search(re) > -1 );
                }
                else {
                    return false;
                }
            }
            else if (partial) {
                return ( my_s.indexOf(my_query) > -1 );
            }
            else {
                var np = new RegExp("(\\b|_)" + escapeRegExp(my_query) + "(\\b|_)");
                if (np) {
                    return ( my_s.search(np) > -1 );
                }
                else {
                    return false;
                }
            }
        }

        function escapeRegExp(str) {
            return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
        }

        function makeNDF(query) {
            var str = query.substring(0, 2);
            if (str === "NN"
                || str === "TC"
                || str === "TN"
                || str === "TS"
                || str === "TI"
                || str === "SY"
                || str === "SN"
                || str === "GN"
                || str === "SS"
                || str === "SA"
                || str === "AN"
                || str === "XR"
                || str === "MS") {
                return str;
            }
            else {
                return null;
            }
        }
    }


    ///////////////////////////////////////////////////////////////////////////////////////////////////


    function toPhylogram() {
        _options.phylogram = true;
        update();
    }

    function toCladegram() {
        _options.phylogram = false;
        update();
    }

    function nodeNameCbClicked() {
        _options.showNodeName = getCheckboxValue('node_name_cb');
        update();
    }

    function taxonomyCbClicked() {
        _options.showTaxonomy = getCheckboxValue('taxonomy_cb');
        update();
    }

    function sequenceCbClicked() {
        _options.showSequence = getCheckboxValue('sequence_cb');
        update();
    }

    function confidenceValuesCbClicked() {
        _options.showConfidenceValues = getCheckboxValue('confidence_values_cb');
        update();
    }

    function branchLengthsCbClicked() {
        _options.showBranchLengthValues = getCheckboxValue('branch_length_values_cb');
        update();
    }

    function internalLabelsCbClicked() {
        _options.showInternalLabels = getCheckboxValue('internal_label_cb');
        update();
    }

    function externalLabelsCbClicked() {
        _options.showExternalLabels = getCheckboxValue('external_label_cb');
        update();
    }

    function internalNodesCbClicked() {
        _options.showInternalNodes = getCheckboxValue('internal_nodes_cb');
        update();
    }

    function externalNodesCbClicked() {
        _options.showExternalNodes = getCheckboxValue('external_nodes_cb');
        update();
    }

    function changeBranchWidth(e, ui) {
        _options.branchWidthDefault = getSliderValue('branch_width_slider', ui);
        update();
    }

    function changeNodeSize(e, ui) {
        _options.internalNodeSize = getSliderValue('node_size_slider', ui);
        update();
    }

    function changeInternalFontSize(e, ui) {
        _options.internalNodeFontSize = getSliderValue('internal_font_size_slider', ui);
        update();
    }

    function changeExternalFontSize(e, ui) {
        _options.externalNodeFontSize = getSliderValue('external_font_size_slider', ui);
        update();
    }

    function changeBranchDataFontSize(e, ui) {
        _options.branchDataFontSize = getSliderValue('branch_data_font_size_slider', ui);
        update();
    }

    function setRadioButtonValue(id, value) {
        var radio = $('#' + id);
        radio[0].checked = value;
        radio.button("refresh");
    }

    function setCheckboxValue(id, value) {
        var cb = $('#' + id);
        cb[0].checked = value;
        cb.button("refresh");
    }

    function setSliderValue(id, value) {
        $('#' + id).slider("value", value);
    }

    function getCheckboxValue(id) {
        return $('#' + id).is(':checked');
    }

    function getSliderValue(id, ui) {
        return ui.value;
    }


    function initializeGui() {
        setSliderValue('external_font_size_slider', _options.externalNodeFontSize);
        setSliderValue('internal_font_size_slider', _options.internalNodeFontSize);
        setSliderValue('branch_data_font_size_slider', _options.branchDataFontSize);
        setSliderValue('node_size_slider', _options.internalNodeSize);
        setSliderValue('branch_width_slider', _options.branchWidthDefault);
        setRadioButtonValue('radio-phylogram', _options.phylogram);
        setRadioButtonValue('radio-cladogram', !_options.phylogram);
        setCheckboxValue('node_name_cb', _options.showNodeName);
        setCheckboxValue('taxonomy_cb', _options.showTaxonomy);
        setCheckboxValue('sequence_cb', _options.showSequence);
        setCheckboxValue('confidence_values_cb', _options.showConfidenceValues);
        setCheckboxValue('branch_length_values_cb', _options.showBranchLengthValues);
        setCheckboxValue('internal_label_cb', _options.showInternalLabels);
        setCheckboxValue('external_label_cb', _options.showExternalLabels);
        setCheckboxValue('internal_nodes_cb', _options.showInternalNodes);
        setCheckboxValue('external_nodes_cb', _options.showExternalNodes);
        initializeVisualizationMenu();


    }


    function initializeVisualizationMenu() {
        if (_dataForVisualization && Object.keys(_dataForVisualization).length) {
            $("select#label_color_select_menu").append($("<option>")
                .val("none")
                .html("none")
            );

            if (_dataForVisualization["distribution"]) {
                $("select#label_color_select_menu").append($("<option>")
                    .val("distribution")
                    .html("distribution")
                );
            }
            if (_dataForVisualization["vipr:host"]) {
                $("select#label_color_select_menu").append($("<option>")
                    .val("vipr:host")
                    .html("host")
                );
            }
            if (_dataForVisualization["vipr:drug"]) {
                $("select#label_color_select_menu").append($("<option>")
                    .val("vipr:drug")
                    .html("antiviral drug")
                );
            }

        }
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////


    // --------------------------------------------------------------
    // Tree functions
    // --------------------------------------------------------------

    function reRoot(tree, n, distance_n_to_parent) {
        console.log("re-rooting");
        console.log("tree: " + tree);
        console.log("n: " + n);
        console.log("distance_n_to_parent: " + distance_n_to_parent);
        console.log("_root: " + _root);

        tree.rooted = true;
        if (!n.parent || !n.parent.parent) {
            console.log("NOTHING TO DO");
            return;
        }
        else if (!n.parent.parent.parent) {
            console.log("PARENT IS ROOT");
            if (( n.parent.children.length === 2 ) && ( distance_n_to_parent >= 0 )) {
                var d = n.parent.children[0].branch_length
                    + n.parent.children[1].branch_length;
                var other;
                if (n.parent.children[0] === n) {
                    other = n.parent.children[1];
                }
                else {
                    other = n.parent.children[0];
                }
                n.branch_length = distance_n_to_parent;
                var dm = d - distance_n_to_parent;
                if (dm >= 0) {
                    other.branch_length = dm;
                }
                else {
                    other.branch_length = 0;
                }
            }
            if (n.parent.children.length > 2) {
                var index = getChildNodeIndex(n.parent, n);

                var dn = n.branch_length;
                var prev_root = _root.children[0];
                prev_root.children.splice(index, 1);
                var new_root = {};
                new_root.children = [];

                setChildNode(new_root, 0, n);
                setChildNode(new_root, 1, prev_root);

                copyBranchData(n, prev_root);

                _root.children[0] = new_root;
                if (distance_n_to_parent >= 0) {
                    n.branch_length = distance_n_to_parent;
                    var d = dn - distance_n_to_parent;
                    if (d >= 0) {
                        prev_root.branch_length = d;
                    }
                    else {
                        prev_root.branch_length = 0;
                    }
                }
                else {
                    if (dn >= 0) {
                        var d = dn / 2.0;
                        n.branch_length = d;
                        prev_root.branch_length = d;
                    }
                }
            }
        }
        else {
            var a = n;
            var b = null;
            var c = null;
            var new_root = {};
            var distance1 = 0.0;
            var distance2 = 0.0;
            var branch_data_1 = null;
            var branch_data_2 = null;
            b = a.parent;
            c = b.parent;

            new_root.children = [];
            setChildNode(new_root, 0, a);
            setChildNode(new_root, 1, b);

            distance1 = c.branch_length;

            branch_data_1 = getBranchData(c);

            c.branch_length = b.branch_length;

            copyBranchData(b, c);
            copyBranchData(a, b);

            // New root is always placed in the middle of the branch:
            if (!a.branch_length) {
                b.branch_length = undefined;
            }
            else {
                if (distance_n_to_parent >= 0.0) {
                    var diff = a.branch_length - distance_n_to_parent;
                    a.branch_length = distance_n_to_parent;
                    b.branch_length = ( diff >= 0.0 ? diff : 0.0 );
                }
                else {
                    var d = a.branch_length / 2.0;
                    a.branch_length = d;
                    b.branch_length = d;
                }
            }
            setChildNodeOnly(b, getChildNodeIndex(b, a), c);
            // moving to the old root, swapping references:
            while (c.parent.parent) {
                a = b;
                b = c;
                c = c.parent;
                setChildNodeOnly(b, getChildNodeIndex(b, a), c);
                b.parent = a;
                distance2 = c.branch_length;
                branch_data_2 = getBranchData(c);
                c.branch_length = distance1;
                setBranchData(c, branch_data_1);
                distance1 = distance2;
                branch_data_1 = branch_data_2;
            }
            // removing the old root:
            if (c.children.length == 2) {
                var node = c.children[1 - getChildNodeIndex(c, b)];
                node.parent = b;
                if (( !c.branch_length  )
                    && ( !node.branch_length  )) {
                    node.branch_length = undefined;
                }
                else {
                    node.branch_length = ( c.branch_length >= 0.0 ? c.branch_length : 0.0 )
                        + ( node.branch_length >= 0.0 ? node.branch_length : 0.0 );
                }
                var cbd = getBranchData(c);
                if (cbd) {
                    setBranchData(node, cbd);
                }
                var l = b.children.length;
                for (var i = 0; i < l; ++i) {
                    if (b.children[i] === c) {
                        setChildNodeOnly(b, i, node);
                        break;
                    }
                }
            }
            else {
                c.parent = b;
                removeChildNode(c, getChildNodeIndex(c, b));
            }
            _root.children[0] = new_root;
        }

        function setChildNodeOnly(parentNode, i, node) {
            if (parentNode.children.length <= i) {
                parentNode.children.push(node);
            }
            else {
                parentNode.children[i] = node;
            }
        }
    }

    function removeChildNode(parentNode, i) {
        if (!parentNode.children) {
            throw ( "cannot remove the child node for a external node" );
        }
        if (( i >= parentNode.children.length ) || ( i < 0 )) {
            throw ( "attempt to get child node " + i + " of a node with "
            + parentNode.children.length + " child nodes." );
        }
        parentNode.children.splice(i, 1);
    }


    /**
     * Inserts node node at the specified position i into the list of
     * child nodes of parentNode. This does not allow null slots in the list of child nodes:
     * If i is larger than the number of child nodes, node is just added to the
     * list, not placed at index i.
     */
    function setChildNode(parentNode, i, node) {
        node.parent = parentNode;
        if (parentNode.children.length <= i) {
            parentNode.children.push(node);
        }
        else {
            parentNode.children[i] = node;
        }
    }

    function getBranchData(node) {
        var branchData = null;
        if (node.width || node.color || node.confidences) {
            branchData = {};
            branchData.width = node.width;
            branchData.color = node.color;
            branchData.confidences = node.confidences;
        }
        return branchData;
    }

    function setBranchData(node, branchData) {
        if (branchData) {
            node.width = branchData.width;
            node.color = branchData.color;
            node.confidences = branchData.confidences;
        }
    }

    function copyBranchData(nodeFrom, nodeTo) {
        nodeTo.width = nodeFrom.width;
        nodeTo.color = nodeFrom.color;
        nodeTo.confidences = nodeFrom.confidences;
    }


    function getChildNodeIndex(parentNode, childNode) {
        if (!parentNode) {
            throw "cannot get the child index for a root node";
        }
        var c = parentNode.children.length;
        for (var i = 0; i < c; ++i) {
            if (parentNode.children[i] === childNode) {
                return i;
            }
        }
        throw "unexpected exception: Could not determine the child index for a node";
    }


    // --------------------------------------------------------------


    // --------------------------------------------------------------
    // For exporting
    // --------------------------------------------------------------
    if (typeof module !== 'undefined' && module.exports && !global.xmldocAssumeBrowser)
        module.exports.archaeopteryx = archaeopteryx;
    else if (typeof window !== "undefined")
        window.archaeopteryx = archaeopteryx;
    else
        this.archaeopteryx = archaeopteryx;
})();


