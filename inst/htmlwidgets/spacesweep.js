HTMLWidgets.widget({

    name: 'spacesweep',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            smallMargin: 5,
            widgetMargin: 10, // marging between widgets
            rootColour: '#DDDADA',
            max_r: 4, // max radius for tree nodes
            pureColour: '#DDDADA',
            monophyleticColour: 'B4AEAE',
            polyphyleticColour: '8E8383'
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
        dim.tabRadius = dim.outerRadius - dim.tabWidth;
        dim.radiusToOncoMix = dim.innerRadius + ((dim.outerRadius - dim.tabWidth - dim.innerRadius)*2/3);
        dim.treeWidth = ((dim.outerRadius - dim.tabWidth - dim.innerRadius)*1/4);
        dim.radiusToTree = dim.innerRadius + dim.treeWidth;

        // GET CONTENT

        // extract all info from tree about nodes, edges, ancestors, descendants
        _getTreeInfo(vizObj);

        // get colour assignment
        _getColours(vizObj);

        // site ids
        vizObj.site_ids = _.uniq(_.pluck(vizObj.userConfig.clonal_prev, "site_id"));

        // get cellular prevalence data in workable format, and threshold it
        _getCPData(vizObj);
        _thresholdCPData(vizObj)

        // get site positioning
        _getOncoMixR(vizObj); // oncoMix radius
        _getSitePositioning(vizObj); // position elements for each site

        console.log("vizObj");
        console.log(vizObj);

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

        // FOR EACH SITE 
        vizObj.site_ids.forEach(function(site, site_idx) {

            var site_data = _.findWhere(vizObj.data.sites, {id: site});
            console.log(site_data);
            var cur_siteG = containerSVG.select(".siteG." + site.replace(/ /g,"_"));

            // PLOT ARC

            var arcData = d3.svg.arc()
                .innerRadius(dim.tabRadius)
                .outerRadius(dim.outerRadius)
                .startAngle(site_data.tab.startAngle)
                .endAngle(site_data.tab.endAngle);

            var arc = cur_siteG.append("g")
                .attr("class", "arcG")
                .attr("transform", "translate(" + dim.width / 2 + "," + dim.width / 2 + ")")
                .append("path")
                .style("fill", dim.pureColour)
                .attr("d", arcData);

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
                    return (vertices[i].real_cell) ? 1 : 0;
                })
                .attr("stroke", function(d, i) {
                    return (vertices[i].real_cell) ? _decrease_brightness(vertices[i].col, 15) : "none";
                })
                .attr("stroke-width", "1.5px")
                .attr("stroke-opacity", function(d, i) {
                    return (vertices[i].real_cell) ? 1 : 0;
                })

            // plot nuclei
            var nuclei = cur_siteG.append("g")
                .attr("class", "nucleiG")
                .selectAll("circle")
                .data(vertices)
                .enter().append("circle")
                .attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; })
                .attr("r", 3)
                .attr("fill", function(d) {
                    return (d.real_cell) ? _decrease_brightness(d.col, 20) : "none";
                })
                .attr("fill-opacity", function(d) { 
                    return (d.real_cell) ? 1 : 0;
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
                .attr('stroke', '#C7C5C5')
                .attr('fill', 'none')                
                .attr("d", _elbow); 
            
            // create nodes
            var cols = vizObj.view.colour_assignment;
            var node = cur_siteG.append("g")
                .attr("class", "treeNodeG")
                .selectAll(".treeNode")                  
                .data(nodes)                   
                .enter()
                .append("circle")     
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
                .attr("id", function(d) { return d.sc_id; })
                .attr("r", function(d) {
                    // clone present at this site or not
                    return (vizObj.data["genotypes_to_plot"][site].indexOf(d.id) != -1) ? dim.max_r : 0;
                });
         });
    },

    resize: function(el, width, height, instance) {

    }

});
