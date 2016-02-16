HTMLWidgets.widget({

    name: 'spacesweep',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            padding: 15,
            treeHeight: 290,
            treeWidth: 290,
            smallMargin: 5,
            widgetMargin: 10, // marging between widgets
            gridsterBaseDimension: 120,
            panel_width: 30,
            fontSize: 11,
            rootColour: '#DDDADA',
            threshold: 0.005, // cellular prevalence threshold of visual detection
            legendGtypeHeight: 13, // height for each genotype in the legend
            patientTabWidth: 40,
            gridCellWidth = 300,
            gridCellHeight = 300,
            nCells = 100 // number of cells to plot for voronoi tessellation view
        };

        // global variable vizObj
        vizObj = {};
        vizObj.data = {};
        vizObj.view = {};

        // set configurations
        var config = $.extend(true, {}, defaults);
        config.width = width;
        config.height = height;
        vizObj.generalConfig = config;

        return {
        }

    },

    renderValue: function(el, x, instance) {

        var dim = vizObj.generalConfig;
        var viewType = "tree"; // choose from: "voronoi", "tree"

        // get params from R
        vizObj.userConfig = x;

        // VIEW ID
        var view_id = el.id;

        // CONTAINER DIV

        var containerDIV = d3.select(el)
            .append("div")
            .attr("class", "containerDIV")
            .style("position", "relative")
            .style("width", dim.width + "px")
            .style("height", dim.height + "px");

        // GET CONTENT

        // extract all info from tree about nodes, edges, ancestors, descendants
        _getTreeInfo(vizObj);

        // get colour assignment
        _getColours(vizObj);

        // site ids
        vizObj.site_ids = _.uniq(_.pluck(vizObj.userConfig.clonal_prev, "site_id"));

        // get cellular prevalence data in better format
        _getCPData(vizObj)

        // VORONOI FUNCTION

        var voronoi = d3.geom.voronoi()
            .clipExtent([[0, 0], [dim.gridCellWidth, dim.gridCellHeight]]);

        // GRIDSTER


        var gridster_ul = containerDIV.append("div") // unordered list
            .attr("class", "gridster")
            .style("float", "left")
            .style("height", (dim.gridCellHeight*3) + "px")
            .style("width", (dim.gridCellWidth*3) + "px")
            .append("ul")    
            .style("float", "left"); 

        var ncols = 3;
        gridster_ul.selectAll("li")
            .data(vizObj.site_ids)
            .enter().append("li")
            .attr("class", function(d) { return "grid_" + d; })
            .attr("data-row", function(d,i) { return "" + Math.ceil((i+1)/ncols); })
            .attr("data-col", function(d,i) { return "" + ((i%ncols)+1); })
            .attr("data-sizex", "1")
            .attr("data-sizey", "1");

        // initialize grid
        $(".gridster ul").gridster({
            widget_margins: [dim.widgetMargin, dim.widgetMargin],
            widget_base_dimensions: [dim.gridCellWidth, 
                                     dim.gridCellHeight],
            max_cols: ncols
        });

        var gridster = $(".gridster ul").gridster().data('gridster');


        // FOR EACH SITE
        vizObj.site_ids.forEach(function(site, site_idx) {

            // COLOURS FOR EACH GENOTYPE TODO---- do we need this for voronoi?

            var colour_assignment = vizObj.view.colour_assignment,
                alpha_colour_assignment = vizObj.view.alpha_colour_assignment;

            // GRID SVG

            var gridSVG = gridster_ul.select(".grid_" + site)
                .append("svg:svg")
                .attr("class", "gridSVG")
                .attr("x", 0)
                .attr("y", 0) 
                .attr("width", dim.gridCellWidth) 
                .attr("height", dim.gridCellHeight);

            // PLOT VORONOI TESSELLATION

            if (viewType == "voronoi") {

                // threshold cellular prevalence data 
                _thresholdCPData(vizObj, site);

                // plot tree title
                var voronoiTitle = gridSVG
                    .append('text')
                    .attr('class', 'voronoiTitle')
                    .attr('x', dim.gridCellWidth/2)
                    .attr('y', 2)
                    .attr('dy', '.71em')
                    .text(site); 

                // voronoi vertices (randomly fill a rectangle, keeping all within a certain 
                // radius from the centre as "real cells", all others as "fake cells")
                _getVoronoiVertices(vizObj, site);

                // add colour (genotype) information to each vertex
                _addGtypeInfoToVertices(vizObj, site);

                // 2D array of x- and y- positions for vertices
                var vertex_coords = [];
                vizObj.data[site]["voronoi_vertices"].forEach(function(vertex) {
                    vertex_coords.push([vertex.x, vertex.y]);
                });

                // plot cells
                var vertices = vizObj.data[site]["voronoi_vertices"];
                var cells = gridSVG.append("g")
                    .selectAll("path")
                    .data(voronoi(vertex_coords), _polygon)
                    .enter().append("path")
                    .attr("d", _polygon)
                    .attr("fill", function(d, i) {
                        return (vertices[i].real_cell) ? vertices[i].col : "none";
                    })
                    .attr("fill-opacity", function(d, i) {
                        return (vertices[i].real_cell) ? 1 : 0;
                    })

                // plot nuclei
                var nuclei = gridSVG.selectAll("circle")
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
            }

            // PLOT TREE

            if (viewType == "tree") {
                var treeType = "varied"; // choose from c("simple", "varied")

                
                // plot tree title
                var treeTitle = gridSVG
                    .append('text')
                    .attr('class', 'treeTitle')
                    .attr('x', dim.gridCellWidth/2)
                    .attr('y', 2)
                    .attr('dy', '.71em')
                    .text(site); 

                // d3 tree layout
                var treePadding = 10,
                    treeTitleHeight = treeTitle.node().getBBox().height,
                    treeLayout = d3.layout.tree()           
                        .size([dim.treeHeight - treePadding - treeTitleHeight, dim.treeWidth - treePadding]); 

                // get nodes and links
                var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
                    nodes = treeLayout.nodes(root), 
                    links = treeLayout.links(nodes);   
             
                // swap x and y direction
                nodes.forEach(function(node) {
                    node.tmp = node.y;
                    node.y = node.x + (treePadding/2) + treeTitleHeight;
                    node.x = node.tmp + (treePadding/2);
                    delete node.tmp;
                });

                // create links
                var link = gridSVG.append("g")
                    .classed("treeLinks", true)
                    .selectAll(".treeLink")                  
                    .data(links)                   
                    .enter().append("path")                   
                    .attr("class","treeLink")
                    .attr('stroke', '#C7C5C5')
                    .attr('fill', 'none')                
                    .attr("d", _elbow); 

                // create nodes
                var max_r = 10;
                var node = gridSVG.selectAll(".treeNode")                  
                    .data(nodes)                   
                    .enter()
                    .append("circle")     
                    .attr("cx", function(d) { return d.x})
                    .attr("cy", function(d) { return d.y})              
                    .classed("treeNode", true) 
                    .attr("fill", function(d) {
                        return colour_assignment[d.id];
                    })
                    .attr('stroke', function(d) {
                        return colour_assignment[d.id];
                    })
                    .attr("id", function(d) { return d.sc_id; })
                    .attr("r", 9)
                    .attr("r", function(d) {
                        if (treeType == "simple") {
                            return max_r;
                        }
                        else {
                            // if the CP data for this genotype is present
                            if (vizObj.data.cp_data[site][d.id]) {
                                return Math.sqrt(vizObj.data.cp_data[site][d.id].cp)*max_r; 
                            }
                            // CP not present
                            else {
                                return 0;
                            }
                        }
                    });
            }
        });
    },

    resize: function(el, width, height, instance) {

    }

});
