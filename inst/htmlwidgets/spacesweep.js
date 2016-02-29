HTMLWidgets.widget({

    name: 'spacesweep',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            smallMargin: 5,
            widgetMargin: 10, // marging between widgets
            rootColour: '#DDDADA',
            max_r: 10, // max radius for tree nodes
            pureColour: '#D3D2D2',
            monophyleticColour: '767676',
            polyphyleticColour: '000000'
        };

        // global variable vizObj
        vizObj = {};
        vizObj.data = {};
        vizObj.view = {};

        // set configurations
        var config = $.extend(true, {}, defaults);
        config.width = (width < height) ? width : height; // width (and height) of view (smallest of the two)
        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var dim = vizObj.generalConfig;
        var viewType = "tree"; // choose from: "voronoi", "tree"

        // get params from R
        vizObj.userConfig = x;
        dim.nCells = x.n_cells;

        // VIEW SETUP

        dim.viewCentre = { x: dim.width/2, y: dim.width/2 };
        dim.viewWidth = dim.width - 4; // 2 px free on either side
        dim.outerRadius = dim.viewWidth/2;
        dim.innerRadius = dim.viewWidth/6; // radius for centre circle (where anatomy will go)
        dim.tabWidth = 30; // width for site tab
        dim.oncoMixWidth = ((dim.outerRadius - dim.tabWidth - dim.innerRadius)/2) - 3;
        dim.radiusToOncoMix = dim.innerRadius + dim.oncoMixWidth/2;
        dim.treeWidth = ((dim.outerRadius - dim.tabWidth - dim.innerRadius)*1/2);
        dim.radiusToTree = dim.innerRadius + dim.oncoMixWidth/2 + dim.treeWidth - 5;

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

        // DIVS

        var containerDIV = d3.select(el)
            .append("div")
            .attr("class", "containerDIV")
            .style("position", "relative")
            .style("width", dim.width + "px")
            .style("height", dim.width + "px");

        var containerSVG = containerDIV.append("svg:svg")
            .attr("class", "containerSVG")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", dim.width + "px")
            .attr("height", dim.width + "px");

        // supergroup containing all site SVG groups
        var siteGs = containerSVG.append("g")
            .attr("class", "siteGs");

        // site groups
        var siteG = siteGs.selectAll(".siteG")
            .data(vizObj.data.sites)
            .enter().append("g")
            .attr("class", function(d) { return "siteG " + d.id.replace(/ /g,"_")});

        // PLOT FULL GENOTYPE TREE

        // tree title
        var bigTreeExtraSpace = 45; // amount of extra space for the big clone phylogeny
        var extraTitleSpace = 12;
        containerSVG.append("text")
            .attr("x", dim.width - dim.treeWidth/2 - extraTitleSpace - bigTreeExtraSpace/2) 
            .attr("y", 22)
            .attr("fill", '#9E9A9A')
            .attr("text-anchor", "middle")
            .attr("font-family", "sans-serif")
            .attr("font-size", "22px")
            .text("Clone Phylogeny");

        // d3 tree layout
        var treePadding = dim.max_r + 2, // keep 1 pixel free on either side of tree
            treeLayout = d3.layout.tree()           
                .size([dim.treeWidth - treePadding*2 + bigTreeExtraSpace, 
                    dim.treeWidth - treePadding*2 + bigTreeExtraSpace]);

        // get nodes and links
        var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
            nodes = treeLayout.nodes(root), 
            links = treeLayout.links(nodes);   

        // swap x and y direction
        nodes.forEach(function(node) {
            node.tmp = node.y;
            node.y = node.x + treePadding + extraTitleSpace; 
            node.x = node.tmp + treePadding + dim.width - dim.treeWidth - extraTitleSpace - bigTreeExtraSpace; 
            delete node.tmp; 
        });

        // create links
        containerSVG.append("g")
            .attr("class","gtypeTreeLinkG")
            .selectAll(".treeLink")                  
            .data(links)                   
            .enter().append("path")                   
            .attr("class","treeLink")
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
        containerSVG.append("g")
            .attr("class", "gtypeTreeNodeG")
            .selectAll(".treeNode")                  
            .data(nodes)                   
            .enter()
            .append("circle")     
            .classed("treeNode", true) 
            .attr("cx", function(d) { return d.x; })
            .attr("cy", function(d) { return d.y; })              
            .attr("fill", function(d) { return cols[d.id]; })
            .attr("stroke", function(d) { return cols[d.id]; })
            .attr("r", "13px");


        // FOR EACH SITE 
        vizObj.site_ids.forEach(function(site, site_idx) {

            var site_data = _.findWhere(vizObj.data.sites, {id: site});
            console.log(site_data);
            var cur_siteG = containerSVG.select(".siteG." + site.replace(/ /g,"_"));

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
                .attr("d", _polygon)
                .attr("fill", function(d, i) {
                    return (vertices[i].real_cell) ? vertices[i].col : "none";
                })
                .attr("fill-opacity", function(d, i) {
                    // if it's a dummy site
                    if (site.substring(0, 5) == "dummy") {
                        return 0;
                    }
                    // not a dummy site
                    return (vertices[i].real_cell) ? 1 : 0;
                })
                .attr("stroke", function(d, i) {
                    return (vertices[i].real_cell) ? _decrease_brightness(vertices[i].col, 15) : "none";
                })
                .attr("stroke-width", "1.5px")
                .attr("stroke-opacity", function(d, i) {
                    // if it's a dummy site
                    if (site.substring(0, 5) == "dummy") {
                        return 0;
                    }
                    // not a dummy site
                    return (vertices[i].real_cell) ? 1 : 0;
                });


            // PLOT TREE

            // d3 tree layout
            var treePadding = dim.max_r + 2, // keep 1 pixel free on either side of tree
                treeLayout = d3.layout.tree()           
                    .size([dim.treeWidth - treePadding*2, dim.treeWidth - treePadding*2]); 

            // get nodes and links
            var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
                nodes = treeLayout.nodes(root), 
                links = treeLayout.links(nodes); 

            // swap x and y direction
            nodes.forEach(function(node) {
                node.tmp = node.y;
                node.y = node.x + treePadding + site_data.tree.top_l_corner.y;
                node.x = node.tmp + treePadding + site_data.tree.top_l_corner.x;
                delete node.tmp;
            });

            // create links
            var link = cur_siteG.append("g")
                .attr("class","treeLinkG")
                .selectAll(".treeLink")                  
                .data(links)                   
                .enter().append("path")                   
                .attr("class","treeLink")
                .attr('stroke', '#9E9A9A')
                .attr('fill', 'none') 
                .attr('stroke-width', '2px')               
                .attr("d", function(d) {
                    if (site.substring(0, 5) == "dummy") {
                        return _elbow(d);
                    }
                    if (vizObj.data.direct_descendants[d.source.id][0] == d.target.id) {
                        return _elbow(d);
                    }
                    return _shortElbow(d);
                })
                .attr("fill-opacity", function() {
                    // if it's a dummy site
                    return (site.substring(0, 5) == "dummy") ? 0 : 1;
                })
                .attr("stroke-opacity", function() {
                    // if it's a dummy site
                    return (site.substring(0, 5) == "dummy") ? 0 : 1;
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
                    return (vizObj.data["genotypes_to_plot"][site].indexOf(d.id) != -1) ? dim.max_r : 0;
                })
                .attr("fill-opacity", function() {
                    // if it's a dummy site
                    return (site.substring(0, 5) == "dummy") ? 0 : 1;
                })
                .attr("stroke-opacity", function() {
                    // if it's a dummy site
                    return (site.substring(0, 5) == "dummy") ? 0 : 1;
                });
            
            // nodeG.append("text")
            //     .attr("x", function(d) { return d.x; })
            //     .attr("y", function(d) { return d.y - dim.max_r - 2; })
            //     .attr("text-anchor", "middle")
            //     .attr("font-family", "sans-serif")
            //     .attr("font-size", "16px")
            //     .attr("fill", '#9E9A9A')
            //     .text(function(d) {
            //         if (vizObj.data["genotypes_to_plot"][site].indexOf(d.id) != -1) {
            //             return (Math.round(vizObj.data.cp_data[site][d.id].cp * 100)/100).toFixed(2);
            //         }
            //         return "";
            //     })
            //     .attr("fill-opacity", function() {
            //         // if it's a dummy site
            //         return (site.substring(0, 5) == "dummy") ? 0 : 1;
            //     })
            //     .attr("stroke-opacity", function() {
            //         // if it's a dummy site
            //         return (site.substring(0, 5) == "dummy") ? 0 : 1;
            //     });

            // PLOT SITE TITLES

            cur_siteG.append("text")
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
                .attr("font-size", "22px")
                .attr("fill", '#9E9A9A')
                .attr("fill-opacity", function() {
                    // if it's a dummy site
                    return (site.substring(0, 5) == "dummy") ? 0 : 1;
                })
                .text(site_data.id);
         });
    },

    resize: function(el, width, height, instance) {

    }

});
