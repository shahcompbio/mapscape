HTMLWidgets.widget({

    name: 'spacesweep',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            smallMargin: 5,
            widgetMargin: 10, // marging between widgets
            rootColour: '#DDDADA',
            pureColour: '#D3D2D2',
            monophyleticColour: '767676',
            polyphyleticColour: '000000',
            legendWidth: 100,
            legendTitleHeight: 16
        };

        // global variable vizObj
        vizObj = {};
        vizObj.data = {};
        vizObj.view = {};

        // set configurations
        var config = $.extend(true, {}, defaults);
        config.containerWidth = width;
        config.containerHeight = height;
        // diameter of the main view
        config.viewDiameter = ((config.containerWidth - config.legendWidth) < config.containerHeight) ? 
            (config.containerWidth - config.legendWidth) :
            config.containerHeight; 
        config.viewCentre = { x: config.viewDiameter/2, y: config.viewDiameter/2 };
        config.outerRadius = config.viewDiameter/2; 
        config.innerRadius = config.viewDiameter/6; // radius for centre circle (where anatomy will go)
        config.circBorderWidth = 3; // width for circular border width
        config.legendHeight = config.viewDiameter;
        // - 3, - 10 for extra space
        config.oncoMixWidth = ((config.outerRadius - config.circBorderWidth - config.innerRadius)/2) - 3; 
        config.treeWidth = ((config.outerRadius - config.circBorderWidth - config.innerRadius)/2) - 10; 
        config.radiusToOncoMix = config.innerRadius + config.oncoMixWidth/2; // radius to oncoMix centre
        config.radiusToTree = config.innerRadius + config.oncoMixWidth + config.treeWidth/2; // radius to tree centre
        config.legendTreeWidth = config.legendWidth - 2; // width of the tree in the legend

        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var dim = vizObj.generalConfig;
        var viewType = "tree"; // choose from: "voronoi", "tree"

        // get params from R
        vizObj.userConfig = x;
        dim.nCells = x.n_cells;

        // GET CONTENT

        // extract all info from tree about nodes, edges, ancestors, descendants
        _getTreeInfo(vizObj);

        // get colour assignment
        _getColours(vizObj);

        // site ids
        vizObj.site_ids = (vizObj.userConfig.site_ids == "NA") ? 
            _.uniq(_.pluck(vizObj.userConfig.clonal_prev, "site_id")):
            vizObj.userConfig.site_ids;

        // get cellular prevalence data in workable format, and threshold it
        _getCPData(vizObj);
        _thresholdCPData(vizObj)

        // get site positioning
        _getSitePositioning(vizObj); // position elements for each site

        // get sites showing each genotype
        _getGenotypeSites(vizObj.data.genotypes_to_plot);

        // get colour palette
        _getColours(vizObj);

        // get anatomic locations on image
        _getSiteLocationsOnImage(vizObj);

        // assign anatomic locations to each site
        _assignAnatomicLocations(vizObj);

        console.log("vizObj");
        console.log(vizObj);

        // VIEW SETUP

        // radii (- 7 = how much space to give between nodes)
        var tree_height = vizObj.data.tree_height; // height of the tree (# nodes)
        dim.node_r = ((dim.treeWidth - 7*tree_height)/tree_height)/2; // site tree
        dim.legendNode_r = ((dim.legendTreeWidth - 7*tree_height)/tree_height)/2; // legend tree

        // DIVS

        var viewDIV = d3.select(el)
            .append("div")
            .attr("class", "viewDIV")
            .style("position", "relative")
            .style("width", dim.viewDiameter + "px")
            .style("height", dim.viewDiameter + "px")
            .style("float", "left");

        var legendDIV = d3.select(el)
            .append("div")
            .attr("class", "legendDIV")
            .style("position", "relative")
            .style("width", dim.legendWidth + "px")
            .style("height", dim.legendHeight + "px")
            .style("float", "left");

        // SVGS

        var viewSVG = viewDIV.append("svg:svg")
            .attr("class", "viewSVG")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", dim.viewDiameter + "px")
            .attr("height", dim.viewDiameter + "px");

        // legend SVG
        var legendSVG = legendDIV.append("svg:svg")
            .attr("class", "legendSVG")
            .attr("x", dim.viewDiameter)
            .attr("y", 0)
            .attr("width", dim.legendWidth)
            .attr("height", dim.legendHeight);

        // PLOT ANATOMY IMAGE

        var image_width = dim.innerRadius*2;
        var image_ref = "http://www.clipartbest.com/cliparts/niE/XL8/niEXL8grT.png";
        var image_top_l = {x: dim.viewDiameter/2 - image_width/2, y: dim.viewDiameter/2 - image_width/2}
        viewSVG.append("image")
            .attr("xlink:href", image_ref)
            .attr("x", image_top_l.x)
            .attr("y", image_top_l.y)
            .attr("width", image_width)
            .attr("height", image_width);

        // PLOT ANATOMIC LOCATIONS - for testing of location accuracy

        // viewSVG.append("g")
        //     .attr("class","anatomicSitesG")
        //     .selectAll(".anatomicSite")                  
        //     .data(vizObj.view.siteLocationsOnImage)                   
        //     .enter()
        //     .append("circle")
        //     .attr("cx", function(d) { return image_top_l.x + (d.x*image_width); })
        //     .attr("cy", function(d) { return image_top_l.y + (d.y*image_width); })
        //     .attr("r", 1)
        //     .attr("fill", "red");

        // SITE SVG GROUPS

        var siteGs = viewSVG.append("g")
            .attr("class", "siteGs")
            .selectAll(".siteG")
            .data(vizObj.data.sites)
            .enter().append("g")
            .attr("class", function(d) { return "siteG " + d.id.replace(/ /g,"_")});

        // PLOT CIRCLE BORDER

        viewSVG.append("circle")
            .attr("cx", dim.viewDiameter/2)
            .attr("cy", dim.viewDiameter/2)
            .attr("r", dim.viewDiameter/2 - 4)
            .attr("fill", "none")
            .attr("stroke", "#F4F3F3")
            .attr("stroke-width", "5px");

        // PLOT FULL GENOTYPE TREE

        // tree title
        legendSVG.append("text")
            .attr("class", "legendTitle")
            .attr("x", dim.legendTreeWidth/2) 
            .attr("y", 22)
            .attr("fill", '#9E9A9A')
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", dim.legendTitleHeight)
            .text("Phylogeny");

        // d3 tree layout
        var treeLayout = d3.layout.tree()           
                .size([dim.legendTreeWidth - dim.legendNode_r*2, 
                    dim.legendTreeWidth - dim.legendNode_r*2]);

        // get nodes and links
        var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
            nodes = treeLayout.nodes(root), 
            links = treeLayout.links(nodes);   

        // swap x and y direction
        nodes.forEach(function(node) {
            node.tmp = node.y;
            node.y = node.x + dim.legendNode_r + dim.legendTitleHeight; 
            node.x = node.tmp + dim.legendNode_r; 
            delete node.tmp; 
        });

        // create links
        var link_ids = [];
        legendSVG.append("g")
            .attr("class","gtypeTreeLinkG")
            .selectAll(".legendTreeLink")                  
            .data(links)                   
            .enter().append("path")                   
            .attr("class", function(d) { 
                d.link_id = "legendTreeLink_" + d.source.id + "_" + d.target.id;
                link_ids.push(d.link_id);
                return d.link_id;
            })
            .attr('stroke', '#9E9A9A')
            .attr('fill', 'none')
            .attr('stroke-width', '2px')               
            .attr("d", function(d) {
                if (vizObj.data.direct_descendants[d.source.id][0] == d.target.id) {
                    return _elbow(d);
                }
                return _shortElbow(d);
            })
            .on("mouseover", function(d) {

                // shade other legend tree nodes & links
                d3.selectAll(".legendTreeNode").attr("fill-opacity", 0.15).attr("stroke-opacity", 0.15);
                d3.selectAll(".legendTreeLink").attr("stroke-opacity", 0.15);

                // shade view
                _shadeView();

                // highlight all elements downstream of link
                _downstreamEffects(vizObj, d.link_id, link_ids);
            })
            .on("mouseout", function() {
                _legendGtypeMouseout(vizObj);
            }); 
        
        // create nodes
        var cols = vizObj.view.colour_assignment;
        legendSVG.append("g")
            .attr("class", "gtypeTreeNodeG")
            .selectAll(".legendTreeNode")                  
            .data(nodes)                   
            .enter()
            .append("circle")     
            .attr("class", function(d) {
                return "legendTreeNode " + d.id;
            })
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })              
            .attr("fill", function(d) { return cols[d.id]; })
            .attr("stroke", function(d) { return cols[d.id]; })
            .attr("r", dim.legendNode_r)
            .on("mouseover", function(d) {

                // shade legend tree nodes & links
                d3.selectAll(".legendTreeNode").attr("fill-opacity", 0.15).attr("stroke-opacity", 0.15);
                d3.selectAll(".legendTreeLink").attr("stroke-opacity", 0.15);

                // shade view
                _shadeView();

                // highlight genotype in legend tree, & sites expressing this genotype
                _legendGtypeHighlight(vizObj, d.id);
            })
            .on("mouseout", function(d) {
                _legendGtypeMouseout(vizObj);
            });

        // TOOLTIP FUNCTIONS

        var nodeTip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
                var cp;
                if (vizObj.data["genotypes_to_plot"][d.site].indexOf(d.id) != -1) {
                    cp = (Math.round(vizObj.data.cp_data[d.site][d.id].cp * 100)/100).toFixed(2);
                }
                else {
                    cp = "";                    
                }
                return "<strong>Prevalence:</strong> <span style='color:white'>" + cp + "</span>";
            });
        viewSVG.call(nodeTip);

        // FOR EACH SITE 
        vizObj.site_ids.forEach(function(site, site_idx) {

            var site_data = _.findWhere(vizObj.data.sites, {id: site}), // data for the current site
                cur_siteG = viewSVG.select(".siteG." + site.replace(/ /g,"_")); // svg group for this site

            // PLOT ONCOMIX

            // voronoi function for this site
            var voronoi = d3.geom.voronoi()
                .clipExtent([[site_data.voronoi.top_l_corner.x, 
                            site_data.voronoi.top_l_corner.y], 
                            [site_data.voronoi.top_l_corner.x + dim.oncoMixWidth, 
                            site_data.voronoi.top_l_corner.y + dim.oncoMixWidth]]);
                
            // plot cells
            var vertices = site_data.voronoi.vertices;
            var cells = cur_siteG.append("g")
                .attr("class", "cellsG")
                .selectAll("path")
                .data(voronoi(site_data.voronoi.vertex_coords), _polygon)
                .enter().append("path")
                .classed("voronoiCell", true)
                .classed(site, true)
                .attr("d", _polygon)
                .attr("fill", function(d, i) {
                    return (vertices[i].real_cell) ? vertices[i].col : "none";
                })
                .attr("fill-opacity", function(d, i) {
                    return (vertices[i].real_cell) ? 1 : 0;
                })
                .attr("stroke", function(d, i) {
                    return (vertices[i].real_cell) ? _decrease_brightness(vertices[i].col, 15) : "none";
                })
                .attr("stroke-width", "1.5px")
                .attr("stroke-opacity", function(d, i) {
                    return (vertices[i].real_cell) ? 1 : 0;
                });


            // PLOT TREE

            // d3 tree layout
            var treeLayout = d3.layout.tree()           
                    .size([dim.treeWidth - dim.node_r*2, dim.treeWidth - dim.node_r*2]); 

            // get nodes and links
            var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
                nodes = treeLayout.nodes(root), 
                links = treeLayout.links(nodes); 

            // swap x and y direction
            nodes.forEach(function(node) {
                node.tmp = node.y;
                node.y = node.x + dim.node_r + site_data.tree.top_l_corner.y;
                node.x = node.tmp + dim.node_r + site_data.tree.top_l_corner.x;
                delete node.tmp;
            });

            // create links
            var link = cur_siteG.append("g")
                .attr("class","treeLinkG")
                .selectAll(".treeLink")                  
                .data(links)                   
                .enter().append("path")                   
                .classed("treeLink", true)
                .classed(site, true)
                .attr('stroke', '#9E9A9A')
                .attr('fill', 'none') 
                .attr('stroke-width', '2px')               
                .attr("d", function(d) {
                    if (vizObj.data.direct_descendants[d.source.id][0] == d.target.id) {
                        return _elbow(d);
                    }
                    return _shortElbow(d);
                }); 
            
            // create nodes
            var cols = vizObj.view.colour_assignment;
            var nodeG = cur_siteG.append("g")
                .attr("class", "treeNodeG")
                .selectAll(".treeNode")                  
                .data(nodes)                   
                .enter()
                .append("g");

            nodeG.append("circle")     
                .attr("cx", function(d) { return d.x})
                .attr("cy", function(d) { return d.y})              
                .classed("treeNode", true) 
                .classed(site, true)
                .attr("fill", function(d) {
                    // clone present at this site or not
                    return (vizObj.data["genotypes_to_plot"][site].indexOf(d.id) != -1) ? 
                        cols[d.id] : "#FFFFFF";
                })
                .attr("stroke", function(d) {
                    // clone present at this site or not
                    return (vizObj.data["genotypes_to_plot"][site].indexOf(d.id) != -1) ? 
                        cols[d.id] : "#FFFFFF";
                })
                .attr("r", function(d) {
                    // clone present at this site or not
                    return (vizObj.data["genotypes_to_plot"][site].indexOf(d.id) != -1) ? dim.node_r : 0;
                })
                .on('mouseover', function(d) {
                    d.site = site;
                    // show tooltip
                    nodeTip.show(d);
                })
                .on('mouseout', function(d) {
                    // hide tooltip
                    nodeTip.hide(d);
                });

            // PLOT SITE TITLES

            cur_siteG.append("text")
                .classed("siteTitle", true)
                .classed(site, true)
                .attr("x", site_data.tree.top_middle.x)
                .attr("y", function() {
                    if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                    // if (site_data.angle > Math.PI || site_data.angle < 0) {
                        return site_data.tree.top_middle.y;
                    }
                    return site_data.tree.bottom_middle.y;
                })
                .attr("dy", function() {
                    if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                    // if (site_data.angle > Math.PI || site_data.angle < 0) {
                        return "+0.71em";
                    }
                    return "0em";
                })
                .attr("text-anchor", "middle")
                .attr("font-family", "sans-serif")
                .attr("font-size", dim.viewDiameter/40)
                .attr("fill", '#9E9A9A')
                .text(site_data.id);

            // PLOT ANATOMIC LINES

            cur_siteG.append("line")
                .attr("x1", site_data.innerRadius.x)
                .attr("y1", site_data.innerRadius.y)
                .attr("x2", image_top_l.x + (site_data.stem.x*image_width))
                .attr("y2", image_top_l.y + (site_data.stem.y*image_width))
                .attr("stroke", "#CBCBCB");

         });
    },

    resize: function(el, width, height, instance) {

    }

});
