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

if (!d3) {
    throw "no d3";
}
(function archaeopteryx() {

    "use strict";

    const TRANSITION_DURATION = 500;
    const PHYLOGRAM_DEFAULT = false;
    const ROOTOFFSET_DEFAULT = 30;
    const DISPLAY_WIDTH_DEFAULT = 800;
    const VIEWERHEIGHT_DEFAULT = 600;
    const RECENTER_AFTER_COLLAPSE_DEFAULT = false;
    const BRANCH_LENGTH_DIGITS_DEFAULT = 4;
    const CONFIDENCE_VALUE_DIGITS_DEFAULT = 2;

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

    function branchLengthScaling(nodes_ary, width) {
        preOrderTraversal(nodes_ary[0], function (n) {
            n.distToRoot = (n.parent ? n.parent.distToRoot : 0) + (n.branch_length || 0);
        });
        var distsToRoot = nodes_ary.map(function (n) {
            return n.distToRoot;
        });
        var yScale = d3.scale.linear()
            .domain([0, d3.max(distsToRoot)])
            .range([0, width]);
        preOrderTraversal(nodes_ary[0], function (n) {
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
        if (d3.event.defaultPrevented) {
            return; // click suppressed
        }
        d = toggleChildren(d);
        update(d, _svgGroup);
        if (_settings.reCenterAfterCollapse) {
            centerNode(d);
        }
    }

    function update(source) {
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

        /* vis.selectAll('g.internal.node')
         .append("svg:text")
         .attr("dx", -6)
         .attr("dy", -6)
         .attr("text-anchor", 'end')
         .attr('font-size', '8px')
         .attr('fill', '#ccc')
         .text(function (d) {
         return d.branch_length;
         });*/

        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function () {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0);
        //  .style("fill", function (d) {
        //       return d._children ? "blue" : "#fff";
        //   });

        nodeEnter.append("text")
            .attr("x", function (d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function (d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(makeExtNodeLabel)
            .style("fill-opacity", 0);

        if (_options.showBranchLengthValues) {
            nodeEnter.append("text")
                .attr("x", function (d) {
                    if (d.parent) {
                        return (d.parent.y - d.y + 1);
                    }
                    else {
                        return 0;
                    }
                })
                // .attr("text-anchor", "middle")
                .attr("dy", "-.25em")
                .attr('class', 'nodeText')
                .text(makeBranchLengthLabel);
        }

        if (_options.showConfidenceValues) {
            nodeEnter.append("text")
                .attr("x", function (d) {
                    if (d.parent) {
                        return (0.5 * (d.parent.y - d.y) );
                    }
                    else {
                        return 0;
                    }
                })
                .attr("text-anchor", "middle")
                .attr("dy", ".90em")
                .attr('class', 'linkText')
                .text(makeConfidenceValuesLabel);
        }

        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2)
            .style("fill", "red")
            .attr('pointer-events', 'mouseover');

        node.select("circle.nodeCircle")
            .attr("r", function (d) {
                return ( d._children || d.children ) ? 3 : 0;
            })
            .style("fill", function (d) {
                return d._children ? "#999" : "#eee";
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
            .data(links, function (d) {
                return d.target.id;
            });

        link.enter().insert("path", "g")
            .attr("class", "link")
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
            return +phynode.branch_length.toFixed(BRANCH_LENGTH_DIGITS_DEFAULT);
        }
        return "";
    };

    var makeConfidenceValuesLabel = function (phynode) {
        if (phynode.confidences && phynode.confidences.length > 0) {
            var c = phynode.confidences;
            if (c.length == 1) {
                if (c[0].value) {
                    return +c[0].value.toFixed(CONFIDENCE_VALUE_DIGITS_DEFAULT);
                }
            }
            else {
                var s = "";
                for (var i = 0; i < c.length; ++i) {
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
        return "";
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

        preOrderTraversal(_treeData, function (d) {
            var l = makeExtNodeLabel(d);
            if (l) {
                _maxLabelLength = Math.max(l.length, _maxLabelLength);
            }
        });

        _root = phylo;
        _root.x0 = _settings.displayHeight / 2;
        _root.y0 = 0;

        update(_root);
        centerNode(_root, _settings.rootOffset);
    };


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


