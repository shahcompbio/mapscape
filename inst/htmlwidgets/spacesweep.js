HTMLWidgets.widget({

    name: 'spacesweep',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            smallMargin: 5,
            widgetMargin: 10, // marging between widgets
            rootColour: '#DDDADA',
            max_r: 15 // max radius for tree nodes
        };

        // global variable vizObj
        vizObj = {};
        vizObj.data = {};
        vizObj.view = {};

        // set configurations
        var config = $.extend(true, {}, defaults);
        config.width = width - 15; // - 15 because vertical scrollbar takes 15 px?
        config.height = height;
        vizObj.generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {

        var dim = vizObj.generalConfig;
        var viewType = "tree"; // choose from: "voronoi", "tree"

        // get params from R
        vizObj.userConfig = x;
        dim.nCells = x.n_cells;

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

        // get cellular prevalence data in workable format
        _getCPData(vizObj)


        // VIEW SETUP - grid cell width / height, num columns

        var ncols = (dim.width/300 < 1) ? 1 : Math.floor(dim.width/300); // minimum of 1 column
        var nrows = Math.ceil(vizObj.site_ids.length/ncols);
        dim.gridCellWidth = (dim.width - dim.widgetMargin*2*ncols)/ncols;
        dim.gridCellHeight = dim.gridCellWidth;

        // VORONOI FUNCTION

        var voronoi = d3.geom.voronoi()
            .clipExtent([[0, 0], [dim.gridCellWidth, dim.gridCellHeight]]);

        // GRIDSTER

        var gridster_ul = containerDIV.append("div") // unordered list
            .attr("class", "gridster")
            .style("float", "left")
            .style("height", ((dim.gridCellHeight*nrows) + (dim.widgetMargin*2*nrows)) + "px")
            .style("width", ((dim.gridCellWidth*ncols) + (dim.widgetMargin*2*ncols)) + "px")
            .append("ul")    
            .style("float", "left"); 

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


            // threshold cellular prevalence data 
            _thresholdCPData(vizObj, site);


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
                var vertex_coords = vizObj.data[site]["voronoi_vertices"].map(function(vertex) {
                    return [vertex.x, vertex.y];
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
                    .attr("stroke", function(d, i) {
                        return (vertices[i].real_cell) ? _decrease_brightness(vertices[i].col, 15) : "none";
                    })
                    .attr("stroke-width", "1.5px")
                    .attr("stroke-opacity", function(d, i) {
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

                // type of tree, choose from:
                //      "simple" - all nodes present, all same radius
                //      "varied" - node area in proportion to its cellular prevalence
                //      "binary" - all nodes same radius, on/off depending on presence at this site
                var treeType = "binary"; 

                // plot tree title
                var treeTitle = gridSVG
                    .append('text')
                    .attr('class', 'treeTitle')
                    .attr('x', dim.gridCellWidth/2)
                    .attr('y', 2)
                    .attr('dy', '.71em')
                    .text(site); 

                // d3 tree layout
                var treePadding = dim.max_r + 2, // keep 1 pixel free on either side of tree
                    treeTitleHeight = treeTitle.node().getBBox().height,
                    treeLayout = d3.layout.tree()           
                        .size([dim.gridCellHeight - treePadding*2 - treeTitleHeight, dim.gridCellWidth - treePadding*2]); 

                // get nodes and links
                var root = $.extend({}, vizObj.data.treeStructure), // copy tree into new variable
                    nodes = treeLayout.nodes(root), 
                    links = treeLayout.links(nodes);   
             
                // swap x and y direction
                nodes.forEach(function(node) {
                    node.tmp = node.y;
                    node.y = node.x + treePadding + treeTitleHeight;
                    node.x = node.tmp + treePadding;
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
                var node = gridSVG.selectAll(".treeNode")                  
                    .data(nodes)                   
                    .enter()
                    .append("circle")     
                    .attr("cx", function(d) { return d.x})
                    .attr("cy", function(d) { return d.y})              
                    .classed("treeNode", true) 
                    .attr("fill", function(d) {
                        // all nodes same radius, on/off depending on presence at this site
                        if (treeType == "binary") {

                            // clone present at this site
                            if (vizObj.data[site].genotypes_to_plot.indexOf(d.id) != -1) {
                                return colour_assignment[d.id];
                            }

                            // clone absent at this site
                            else {
                                return "#FFFFFF"; // white
                            }
                        } 

                        // any other view has colour assignment for each node
                        return colour_assignment[d.id];
                    })
                    .attr("stroke", function(d) {
                        // all nodes same radius, on/off depending on presence at this site
                        if (treeType == "binary") {

                            // clone present at this site
                            if (vizObj.data[site].genotypes_to_plot.indexOf(d.id) != -1) {
                                return colour_assignment[d.id];
                            }

                            // clone absent at this site
                            else {
                                return "#C7C5C5"; // white
                            }
                        } 

                        // any other view has colour assignment for each node
                        return colour_assignment[d.id];
                    })
                    .attr("id", function(d) { return d.sc_id; })
                    .attr("r", function(d) {
                        // all nodes present, all same radius
                        if (treeType == "simple") {
                            return dim.max_r;
                        }

                        // node area in proportion to its cellular prevalence
                        else if (treeType == "varied") {
                            // if the CP data for this clone is present
                            if (vizObj.data.cp_data[site][d.id]) {
                                return Math.sqrt(vizObj.data.cp_data[site][d.id].cp)*dim.max_r; 
                            }
                            // CP not present
                            else {
                                return 0;
                            }
                        }

                        // all nodes same radius, on/off depending on presence at this site
                        else if (treeType == "binary") {
                            return dim.max_r;
                        }
                    });
            }
        });
    },

    resize: function(el, width, height, instance) {

    }

});
