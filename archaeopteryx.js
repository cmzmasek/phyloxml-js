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

// v 0_18

if (!d3) {
    throw "no d3";
}
(function archaeopteryx() {

    "use strict";

    var TRANSITION_DURATION = 500;
    var PHYLOGRAM_DEFAULT = false;
    var ROOTOFFSET_DEFAULT = 30;
    var DISPLAY_WIDTH_DEFAULT = 800;
    var VIEWERHEIGHT_DEFAULT = 600;
    var RECENTER_AFTER_COLLAPSE_DEFAULT = false;
    var BRANCH_LENGTH_DIGITS_DEFAULT = 4;
    var CONFIDENCE_VALUE_DIGITS_DEFAULT = 2;

    // "Instance variables"
    var _root = null;
    var _svgGroup = null;
    var _baseSvg = null;
    var _tree = null;
    var _treeData = null;
    var _options = null;
    var _settings = null;
    var _maxLabelLength = 0;
    var _i = 0;
    var _yScale = null;


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

    function expand(d) {
        if (d._children) {
            d.children = d._children;
            d.children.forEach(expand);
            d._children = null;
        }
    }

    function centerNode(source, x) {
        var scale = zoomListener.scale();

        var y = -source.x0;
        if (!x) {
            x = -source.y0;
            x = x * scale + _settings.displayWidth / 2;
        }
        y = y * scale + _settings.displayHeight / 2;
        d3.select('g').transition()
            .duration(TRANSITION_DURATION)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
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
        update(d/*, _svgGroup*/);
        if (_settings.reCenterAfterCollapse) {
            centerNode(d);
        }
    }


    function update(source) {

        if (!source) {
            source = _root;
        }

        var nodes_ary = _tree(_treeData);

        _tree = _tree.size([_settings.displayHeight, _settings.displayWidth - (_settings.rootOffset + _maxLabelLength * 10)]);

        _tree = _tree.separation(function separation(a, b) {
            return a.parent == b.parent ? 1 : 1;
        });

        var nodes = _tree.nodes(_root).reverse();
        var links = _tree.links(nodes);

        var w = _settings.displayWidth - (_settings.rootOffset + _maxLabelLength * 10);
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
            .style("cursor", "pointer")
            .attr('class', 'nodeCircle')
            .attr("r", 0);

        nodeEnter.append("text")
            .attr("class", "extlabel")
            .attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            })
            .style("fill", makeLabelColor)
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(makeExtNodeLabel)
            .style("fill-opacity", 0.5);

        if (_options.showBranchLengthValues) {
            nodeEnter.append("text")
                .attr("class", "bllabel")
                .text(makeBranchLengthLabel);
        }

        if (_options.showConfidenceValues) {
            nodeEnter.append("text")
                .attr("class", "conflabel")
                .attr("text-anchor", "middle")
                .text(makeConfidenceValuesLabel);
        }

        node.select("text.extlabel")
            .style("font-size", function (d) {
                return d.children || d._children ? _options.internalNodeFontSize : _options.externalNodeFontSize
            })
            .attr("y", function (d) {
                return d.children || d._children ? 0.3 * _options.internalNodeFontSize : 0.3 * _options.externalNodeFontSize
            });

        node.select("text.bllabel")
            .style("font-size", _options.branchDataFontSize)
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
            .style("font-size", _options.branchDataFontSize)
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
                return ( _options.internalNodeSize > 0 && ( ( d._children || d.children ) && d.parent ) ) ? _options.internalNodeSize : 0;
            })
            .style("stroke", makeNodeColor)
            .style("stroke-width", _options.branchWidthDefault)
            .style("fill", function (d) {
                return d._children ? makeNodeColor(d) : _options.backgroundColorDefault;
            });

        var nodeUpdate = node.transition()
            .duration(TRANSITION_DURATION)
            .attr("transform", function (d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        var nodeExit = node.exit().transition()
            .duration(TRANSITION_DURATION)
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
            .duration(TRANSITION_DURATION)
            .attr("d", elbow);

        link.exit().transition()
            .duration(TRANSITION_DURATION)
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
        if (phynode.color) {
            var c = phynode.color;
            return "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
        }
        return _options.branchColorDefault;
    };

    var makeLabelColor = function (phynode) {
        if (phynode.color) {
            var c = phynode.color;
            return "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
        }
        return _options.labelColorDefault;
    };

    var makeExtNodeLabel = function (phynode) {
        var l = "";
        if (_options.showNodeName) {
            l = append(l, phynode.name);
        }
        if (phynode.taxonomies && phynode.taxonomies.length > 0) {
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
        if (phynode.sequences && phynode.sequences.length > 0) {
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
        if (_options.showDisributions && phynode.distributions && phynode.distributions.length > 0) {
            var d = phynode.distributions;
            for (var i = 0; i < d.length; ++i) {
                l = appendB(l, d[i].desc);
            }
        }
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

    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);

    function initializeOptions(options) {
        _options = options ? options : {};
        if (!_options.phylogram) {
            _options.phylogram = PHYLOGRAM_DEFAULT;
        }
        if (!_options.showBranchLengthValues) {
            _options.showBranchLengthValues = false;
        }
        if (!_options.showConfidenceValues) {
            _options.showConfidenceValues = false;
        }
        if (!_options.showNodeName) {
            _options.showNodeName = false;
        }
        if (!_options.showTaxonomyCode) {
            _options.showTaxonomyCode = false;
        }
        if (!_options.showTaxonomyScientificName) {
            _options.showTaxonomyScientificName = false;
        }
        if (!_options.showTaxonomyCommonName) {
            _options.showTaxonomyCommonName = false;
        }
        if (!_options.showTaxonomyRank) {
            _options.showTaxonomyRank = false;
        }
        if (!_options.showTaxonomySynonyms) {
            _options.showTaxonomySynonyms = false;
        }
        if (!_options.showSequenceSymbol) {
            _options.showSequenceSymbol = false;
        }
        if (!_options.showSequenceName) {
            _options.showSequenceName = false;
        }
        if (!_options.showSequenceGeneSymbol) {
            _options.showSequenceGeneSymbol = false;
        }
        if (!_options.showDisributions) {
            _options.showDisributions = false;
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
        if (!_options.minConfidenceValueToShow) {
            _options.minConfidenceValueToShow = null;
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
    }

    archaeopteryx.launch = function (id, phylo, options, settings) {
        _treeData = phylo;

        initializeOptions(options);
        initializeSettings(settings);

        _baseSvg = d3.select(id).append("svg")
            .attr("width", _settings.displayWidth)
            .attr("height", _settings.displayHeight)
            .attr("class", "overlay")
            .call(zoomListener);

        _svgGroup = _baseSvg.append("g");

        _tree = d3.layout.cluster()
            .size([_settings.displayHeight, _settings.displayWidth]);

        _tree.clickEvent = getClickEventListenerNode(phylo); //TODO

        preOrderTraversal(_treeData, function (d) {
            var l = makeExtNodeLabel(d);
            if (l) {
                _maxLabelLength = Math.max(l.length, _maxLabelLength);
            }
        });

        _root = phylo;
        _root.x0 = _settings.displayHeight / 2;
        _root.y0 = 0;
        initializeGui();
        update(_root);
        centerNode(_root, _settings.rootOffset);
    };


    ///////////////////////////////////////////////////////////////////////////////////////////////


    function removeTooltips() {
        _svgGroup.selectAll(".tooltipElem").remove();
    }


    function getChildren(d) {
        return d._children ? d._children : (d.children ? d.children : []);
    }


    function getClickEventListenerNode(tree) {

        function nodeClick(d) {

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
            var rectHeight = 110;

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
                    if (d._children) {
                        textSum += textInc;
                        return "Uncollapse";
                    }
                    else if (d.children) {
                        textSum += textInc;
                        return "Collapse";
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
                    if (d.children) {
                        textSum += textInc;
                        return "Swap Descendants";
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
                    if (d.children) {
                        textSum += textInc;
                        return "Order Subtree";
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
                    if (d.parent && d.parent.parent) {
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
        if ((d.target.getAttribute("class") !== "nodeCircle")) {
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
        $("#radio-phylogram").click(toPhylogram);
    });

    $(function () {
        $("#radio-cladogram").click(toCladegram);
    });


    function toPhylogram() {
        _options.phylogram = true;
        update();
    }

    function toCladegram() {
        _options.phylogram = false;
        update();
    }


    function changeBranchWidth() {
        var v = $("#branch_width_slider").slider("value");
        _options.branchWidthDefault = v;
        update();
    }

    function changeNodeSize() {
        var v = $("#node_size_slider").slider("value");
        _options.internalNodeSize = v;
        update();
    }

    function changeInternalFontSize() {
        var v = $("#internal_font_size_slider").slider("value");
        _options.internalNodeFontSize = v;
        update();
    }

    function changeExternalFontSize() {
        var v = $("#external_font_size_slider").slider("value");
        _options.externalNodeFontSize = v;
        update();
    }

    function changeBranchDataFontSize() {
        var v = $("#branch_data_font_size_slider").slider("value");
        _options.branchDataFontSize = v;
        update();
    }

    function setRadio(id, status) {
        var radio = $('#' + id);
        radio[0].checked = status;
        radio.button("refresh");
    }

    function initializeGui() {
        $("#external_font_size_slider").slider("value", _options.externalNodeFontSize);
        $("#internal_font_size_slider").slider("value", _options.internalNodeFontSize);
        $("#branch_data_font_size_slider").slider("value", _options.branchDataFontSize);
        $("#node_size_slider").slider("value", _options.internalNodeSize);
        $("#branch_width_slider").slider("value", _options.branchWidthDefault);
        setRadio("radio-phylogram", _options.phylogram);
        setRadio("radio-cladogram", !_options.phylogram);
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////

    // options.skipBranchLengthScaling = !$('#scale_distance').is(':checked');


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





