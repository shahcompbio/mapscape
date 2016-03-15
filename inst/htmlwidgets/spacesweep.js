HTMLWidgets.widget({

    name: 'spacesweep',

    type: 'output',

    initialize: function(el, width, height) {

        // defaults
        var defaults = {
            smallMargin: 5,
            widgetMargin: 10, // marging between widgets
            rootColour: '#717171',
            pureColour: '#D3D2D2',
            monophyleticColour: '767676',
            polyphyleticColour: '000000',
            anatomicLineColour: '#CBCBCB',
            generalMarkHighlightColour: "#616161",
            legendWidth: 130,
            legendTitleHeight: 16,
            mixtureClassFontSize: 13,
            max_r: 8, // maximum radius for tree nodes
            siteMark_r: 4, // site mark radius
            dragOn: false, // whether or not drag is on
            selectOn: false, // whether or not link selection is on
            mutSelectOn: false, // whether or not the mutation selection is on
            startLocation: Math.PI/2, // starting location [0, 2*Math.PI] of site ordering
            legendSpacing: 15, // spacing between legend items
            shadeAlpha: 0.15, // alpha value for shading
            neutralGrey: "#9E9A9A", // grey used for font colour, anatomic lines, etc.
            legendTitleColour: "#000000", // colour used for legend titles
            anatomy_male_image_ref: "https://bytebucket.org/mas29/public_resources/raw/c9e20e1236b6996a30bc2948627beb57ec185243/images/anatomy/muscle_anatomy_male.png",
            anatomy_female_image_ref: "https://bytebucket.org/mas29/public_resources/raw/c9e20e1236b6996a30bc2948627beb57ec185243/images/anatomy/muscle_anatomy_female.png"
        };

        // set configurations
        var config = $.extend(true, {}, defaults);
        config.containerWidth = width;
        config.containerHeight = height;

        // global variable vizObj
        vizObj = {};
        var view_id = el.id;
        vizObj[view_id] = {};
        vizObj[view_id].data = {};
        vizObj[view_id].view = {};
        vizObj[view_id].generalConfig = config;

        return {}

    },

    renderValue: function(el, x, instance) {


        // vizObj for the current view
        var view_id = el.id;
        var curVizObj = vizObj[view_id]; 
        curVizObj.view_id = view_id;
        var dim = curVizObj.generalConfig;

        // get params from R
        curVizObj.userConfig = x;

        // SET CONFIGURATIONS FOR THIS VIEW

        // mutation table layout
        dim.mutationTableHeight = 300;

        // main view layout
        dim.viewDiameter = ((dim.containerWidth-dim.legendWidth) < (dim.containerHeight-dim.mutationTableHeight)) ? 
            (dim.containerWidth-dim.legendWidth) :
            (dim.containerHeight-dim.mutationTableHeight); 
        dim.mutationTableWidth = dim.viewDiameter + dim.legendWidth;
        dim.viewCentre = { x: dim.viewDiameter/2, y: dim.viewDiameter/2 };
        dim.outerRadius = dim.viewDiameter/2; 
        dim.innerRadius = dim.viewDiameter/6; // radius for centre circle (where anatomy will go)
        dim.circBorderWidth = 3; // width for circular border width
        
        // - 3, - 10 for extra space
        dim.oncoMixWidth = ((dim.outerRadius - dim.circBorderWidth - dim.innerRadius)/2) - 3; 
        dim.treeWidth = ((dim.outerRadius - dim.circBorderWidth - dim.innerRadius)/2) - 10; 
        dim.radiusToOncoMix = dim.innerRadius + dim.oncoMixWidth/2; // radius to oncoMix centre
        dim.radiusToTree = dim.innerRadius + dim.oncoMixWidth + dim.treeWidth/2; // radius to tree centre

        // legend layout
        dim.legendHeight = dim.viewDiameter;
        dim.legendTreeWidth = dim.legendWidth - 2; // width of the tree in the legend
        dim.legend_image_plot_width = dim.legendWidth; // width of the plot space for the image
        dim.legend_image_top_l = {x: 0, y: dim.legendTreeWidth + dim.legendTitleHeight*2 + dim.legendSpacing};
        // legend mixture classification configurations
        dim.legend_mixture_top = dim.legend_image_top_l.y + dim.legend_image_plot_width + dim.legendSpacing;

        // anatomical image configurations
        dim.image_plot_width = dim.innerRadius*2; // width of the plot space for the image
        dim.image_top_l = {x: dim.viewDiameter/2 - dim.image_plot_width/2, 
                                y: dim.viewDiameter/2 - dim.image_plot_width/2};

        // GET CONTENT

        // get anatomic locations on image
        _getSiteLocationsOnImage(curVizObj);

        // extract all info from tree about nodes, edges, ancestors, descendants
        _getTreeInfo(curVizObj);

        // get colour assignment
        _getColours(curVizObj);

        // site ids
        curVizObj.data.site_ids = (curVizObj.userConfig.site_ids == "NA") ? 
            _.uniq(_.pluck(curVizObj.userConfig.clonal_prev, "site_id")):
            curVizObj.userConfig.site_ids;

        // assign anatomic locations to each site
        _assignAnatomicLocations(curVizObj);

        // get image bounds for current site data 
        _getImageBounds(curVizObj);

        // if no site ordering is given by the user
        if (curVizObj.userConfig.site_ids == "NA") {
            // initial ordering of sites based on their anatomic location
            _initialSiteOrdering(curVizObj);
        }

        // get cellular prevalence data in workable format, and threshold it
        _getCPData(curVizObj);
        _thresholdCPData(curVizObj)

        // get site positioning
        _getSitePositioning(curVizObj); // position elements for each site

        // get sites showing each genotype
        _getGenotypeSites(curVizObj);

        // get sites affected by each link (identified here by its target clone)
        _getSitesAffectedByLink(curVizObj);

        // get mutation data in better format
        _reformatMutations(curVizObj);

        console.log("curVizObj");
        console.log(curVizObj);

        // VIEW SETUP

        // radii (- 11 = how much space to give between nodes)
        var tree_height = curVizObj.data.tree_height, // height of the tree (# nodes)
            node_r = ((dim.treeWidth - 11*tree_height)/tree_height)/2, // site tree
            legendNode_r = ((dim.legendTreeWidth - 11*tree_height)/tree_height)/2; // legend tree

        // make sure radii do not surpass the maximum
        dim.node_r = (node_r > dim.max_r) ? dim.max_r : node_r;
        dim.legendNode_r = (legendNode_r > dim.max_r) ? dim.max_r : legendNode_r;

        // DRAG BEHAVIOUR

        var drag = d3.behavior.drag()
            .on("dragstart", function(d) {
                dim.dragOn = true; 

                // calculate angle w/the positive x-axis, formed by the line segment between the mouse & view centre
                var voronoiCentre = d3.select("#" + view_id).select(".anatomicPointer.site_"+d.site); 
                curVizObj.view.startAngle = _find_angle_of_line_segment(
                    {x: voronoiCentre.attr("x1"), y: voronoiCentre.attr("y1")},
                    {x: dim.viewCentre.x, y: dim.viewCentre.y});
            })
            .on("drag", function(d,i) {

                // operations on drag
                _dragFunction(curVizObj, d.site, d);
            })
            .on("dragend", function(d) {
                dim.dragOn = false; 

                // calculate angle w/the positive x-axis, formed by the line segment between the mouse & view centre
                var voronoiCentre = d3.select("#" + view_id).select(".anatomicPointer.site_"+d.site); 
                curVizObj.view.endAngle = _find_angle_of_line_segment(
                    {x: voronoiCentre.attr("x1"), y: voronoiCentre.attr("y1")},
                    {x: dim.viewCentre.x, y: dim.viewCentre.y});

                // order sites
                _reorderSitesData(curVizObj);

                // get site positioning coordinates etc
                _getSitePositioning(curVizObj);   

                // reposition sites on the screen
                _snapSites(curVizObj);
            });

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

        curVizObj.view.mutationTableDIV = d3.select(el)
            .append("div")
            .attr("class", "mutationTableDIV")
            .style("position", "relative")
            .style("width", dim.mutationTableWidth + "px")
            .style("height", dim.mutationTableHeight + "px")
            .style("float", "left");

        // SVGS

        var viewSVG = viewDIV.append("svg:svg")
            .attr("class", "viewSVG")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", dim.viewDiameter + "px")
            .attr("height", dim.viewDiameter + "px")
            .on("click", function() {
                _backgroundClick(curVizObj);
            });

        var legendSVG = legendDIV.append("svg:svg")
            .attr("class", "legendSVG")
            .attr("x", dim.viewDiameter)
            .attr("y", 0)
            .attr("width", dim.legendWidth)
            .attr("height", dim.legendHeight)
            .on("click", function() {
                _backgroundClick(curVizObj);
            });

        // PLOT ANATOMY IMAGE IN MAIN VIEW

        var defs = viewSVG.append("defs").attr("id", "imgdefs")

        var anatomyPattern = defs.append("pattern")
                                .attr("id", "anatomyPattern")
                                .attr("height", 1)
                                .attr("width", 1)

        anatomyPattern.append("image")
            .attr("class", "anatomyImage")
            .attr("x", 0)
            .attr("y", 0)
            .attr("height", dim.image_plot_width)
            .attr("width", dim.image_plot_width)
            .attr("xlink:href", function() {
                if (curVizObj.userConfig.gender == "F") {
                    return dim.anatomy_female_image_ref;
                }
                return dim.anatomy_male_image_ref;
            });

        viewSVG.append("circle")
            .attr("class", "anatomyDiagram")
            .attr("r", dim.innerRadius)
            .attr("cy", dim.viewDiameter/2)
            .attr("cx", dim.viewDiameter/2)
            .attr("fill", "url(#anatomyPattern)")
            .attr("stroke", "#CBCBCB")
            .attr("stroke-width", "3px")
            .attr("stroke-opacity", 0.2);

        // ZOOM INTO SELECT REGION ON ANATOMICAL IMAGE

        // get scaling information
        curVizObj.view.crop_info = _scale(curVizObj);

        // update the anatomy image with the new cropping
        d3.select("#" + view_id).select(".anatomyImage") 
            .attr("height", curVizObj.view.crop_info.new_width)
            .attr("width", curVizObj.view.crop_info.new_width)
            .attr("x", -curVizObj.view.crop_info.left_shift)
            .attr("y", -curVizObj.view.crop_info.up_shift);          

        // SITE SVG GROUPS

        var siteGs = viewSVG.append("g")
            .attr("class", "siteGs")
            .selectAll(".siteG")
            .data(curVizObj.data.sites)
            .enter().append("g")
            .attr("class", function(d) { return "siteG site_" + d.id.replace(/ /g,"_")});

        // PLOT CIRCLE BORDER

        viewSVG.append("circle")
            .attr("cx", dim.viewDiameter/2)
            .attr("cy", dim.viewDiameter/2)
            .attr("r", dim.viewDiameter/2 - 4)
            .attr("fill", "none")
            .attr("stroke", "#F4F3F3")
            .attr("stroke-width", "5px");

        // PLOT LEGEND GENOTYPE TREE

        // tree title
        legendSVG.append("text")
            .attr("class", "legendTitle")
            .attr("x", dim.legendWidth/2) 
            .attr("y", 22)
            .attr("font-size", dim.legendTitleHeight)
            .text("Phylogeny");

        // d3 tree layout
        var treeLayout = d3.layout.tree()           
                .size([dim.legendTreeWidth - dim.legendNode_r*2, 
                    dim.legendTreeWidth - dim.legendNode_r*2]);

        // get nodes and links
        var root = $.extend({}, curVizObj.data.treeStructure), // copy tree into new variable
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
                return "legendTreeLink " + d.link_id;
            })
            .attr('stroke', dim.neutralGrey)
            .attr('fill', 'none')
            .attr('stroke-width', '2px')               
            .attr("d", function(d) {
                if (curVizObj.data.direct_descendants[d.source.id][0] == d.target.id) {
                    return _elbow(d);
                }
                return _shortElbow(d);
            })
            .on("mouseover", function(d) {
                if (_checkForSelections(curVizObj)) {
                    // shade other legend tree nodes & links
                    d3.select("#" + view_id)
                        .selectAll(".legendTreeNode")
                        .attr("fill-opacity", dim.shadeAlpha)
                        .attr("stroke-opacity", dim.shadeAlpha);
                    d3.select("#" + view_id)
                        .selectAll(".legendTreeLink")
                        .attr("stroke-opacity", dim.shadeAlpha);

                    // shade view
                    _shadeMainView(curVizObj);

                    // highlight all elements downstream of link
                    _downstreamEffects(curVizObj, d.link_id, link_ids);
                }
            })
            .on("mouseout", function() {
                if (_checkForSelections(curVizObj)) {
                    _resetView(curVizObj);
                }
            })
            .on("click", function(d) {
                dim.selectOn = true;

                _resetView(curVizObj);

                // target clone of this link
                var cur_target = d.target.id;

                // shade other links
                d3.select("#" + view_id).selectAll(".legendTreeLink").attr("stroke-opacity", 0.15);

                // highlight the link
                d3.select(this).attr("stroke", "red").attr("stroke-opacity", 1);

                // delete existing data table
                d3.select("#" + curVizObj.view_id + "_mutationTable" + "_wrapper").remove();

                // get filtered data
                var gtypeAndAncestors = curVizObj.data.treeAncestorsArr[cur_target];
                gtypeAndAncestors.push(cur_target);
                var filtered_muts = _.filter(curVizObj.data.mutations, function(mut) { 
                                                        return gtypeAndAncestors.indexOf(mut.clone_id) != -1; 
                                                    });

                // plot filtered data table
                _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, filtered_muts, "Gene Name", 
                    dim.mutationTableHeight);

                d3.event.stopPropagation();
            });
        
        // create nodes
        var cols = curVizObj.view.colour_assignment;
        legendSVG.append("g")
            .attr("class", "gtypeTreeNodeG")
            .selectAll(".legendTreeNode")                  
            .data(nodes)                   
            .enter()
            .append("circle")     
            .attr("class", function(d) {
                return "legendTreeNode clone_" + d.id;
            })
            .attr("cx", ƒ('x'))
            .attr("cy", ƒ('y'))              
            .attr("fill", function(d) { 
                // if user does not want to show the root
                if (!curVizObj.userConfig.show_root && d.id == "Root") {
                    return "none";
                }
                return cols[d.id]; 
            })
            .attr("stroke", function(d) { 
                // if user does not want to show the root
                if (!curVizObj.userConfig.show_root && d.id == "Root") {
                    return "none";
                }
                return cols[d.id]; 
            })
            .attr("r", dim.legendNode_r)
            .on("mouseover", function(d) {
                if (_checkForSelections(curVizObj)) {
                    // shade legend tree nodes & links
                    d3.select("#" + view_id)
                        .selectAll(".legendTreeNode")
                        .attr("fill-opacity", dim.shadeAlpha)
                        .attr("stroke-opacity", dim.shadeAlpha);
                    d3.select("#" + view_id)
                        .selectAll(".legendTreeLink")
                        .attr("stroke-opacity", dim.shadeAlpha);

                    // shade view
                    _shadeMainView(curVizObj);

                    // highlight genotype in legend tree, & sites expressing this genotype
                    _legendGtypeHighlight(curVizObj, d.id);

                    // highlight those sites showing the moused-over genotype
                    _highlightSites(curVizObj.data.genotype_sites[d.id]);
                }
            })
            .on("mouseout", function(d) {
                if (_checkForSelections(curVizObj)) {
                    _resetView(curVizObj);
                }
            });

        // PLOT ANATOMY IN LEGEND

        // anatomy title
        legendSVG.append("text")
            .attr("class", "legendTitle")
            .attr("x", dim.legendWidth/2) 
            .attr("y", dim.legend_image_top_l.y - dim.legendTitleHeight)
            .attr("font-size", dim.legendTitleHeight)
            .text("Anatomy");

        // anatomy image
        legendSVG.append("image")
            .attr("xlink:href", function() {
                if (curVizObj.userConfig.gender == "F") {
                    return dim.anatomy_female_image_ref;
                }
                return dim.anatomy_male_image_ref;
            })
            .attr("x", dim.legend_image_top_l.x)
            .attr("y", dim.legend_image_top_l.y)
            .attr("width", dim.legend_image_plot_width)
            .attr("height", dim.legend_image_plot_width);

        // anatomy region of interest
        legendSVG.append("circle")
            .attr("cx", dim.legend_image_top_l.x + curVizObj.view.crop_info.centre_prop.x*dim.legend_image_plot_width)
            .attr("cy", dim.legend_image_top_l.y + curVizObj.view.crop_info.centre_prop.y*dim.legend_image_plot_width)
            .attr("r", (curVizObj.view.crop_info.crop_width_prop/2)*dim.legend_image_plot_width)
            .attr("stroke", dim.neutralGrey)
            .attr("fill", "none");

        // PLOT ANATOMIC MARKS FOR EACH SITE STEM (e.g. "Om", "ROv")

        viewSVG.append("g")
            .attr("class", "anatomicMarksG")
            .selectAll(".generalMark")
            .data(Object.keys(curVizObj.data.siteStems))
            .enter()
            .append("circle")
            .attr("class", function(d) {
                return "stem_" + d + " generalMark";
            })
            .attr("cx", function(d) { return curVizObj.data.siteStems[d]["cropped_coords"].x; })
            .attr("cy", function(d) { return curVizObj.data.siteStems[d]["cropped_coords"].y; })
            .attr("r", dim.siteMark_r)
            .attr("fill", "white")
            .attr("stroke-width", "1.5pxx")
            .attr("stroke", "#CBCBCB")
            .on("mouseover", function(d) {
                if (_checkForSelections(curVizObj)) {
                    // highlight this stem location
                    d3.select(this)
                        .attr("fill", dim.generalMarkHighlightColour);

                    // shade view
                    _shadeMainView(curVizObj);

                    // highlight all sites with this stem
                    _highlightSites(curVizObj.data.siteStems[d].site_ids, view_id);
                }
            })
            .on("mouseout", function(d) {
                if (_checkForSelections(curVizObj)) {
                    _resetView(curVizObj);
                }
            });

        // PLOT MIXTURE CLASSIFICATION

        var mixture_classes = {};
        curVizObj.data.sites.forEach(function(site) {
            mixture_classes[site.phyly] = mixture_classes[site.phyly] || [];
            mixture_classes[site.phyly].push({"site_id": site.id, 
                                                "site_stem": (site.stem)? site.stem.siteStem : null});
        })

        // plot mixture classification title
        legendSVG.append("text")
            .attr("class", "MixtureLegendTitle legendTitle")
            .attr("x", dim.legendWidth/2) 
            .attr("y", dim.legend_mixture_top)
            .attr("dy", "+0.71em")
            .attr("font-size", dim.legendTitleHeight)
            .text("Mixture");
        legendSVG.append("text")
            .attr("class", "ClassificationLegendTitle legendTitle")
            .attr("x", dim.legendWidth/2) 
            .attr("y", dim.legend_mixture_top + dim.legendTitleHeight)
            .attr("dy", "+0.71em")
            .attr("font-size", dim.legendTitleHeight)
            .text("Classification");

        var mixtureClassLegendTitle_width = 
            d3.select("#" + view_id).select(".ClassificationLegendTitle").node().getBBox().width;
        var spacing_below_title = 5;
        Object.keys(mixture_classes).forEach(function(phyly, phyly_idx) {
            legendSVG.append("text")
                .attr("class", "mixtureClass")
                .attr("x", dim.legendWidth/2 - (mixtureClassLegendTitle_width/2)) 
                .attr("y", function() {
                    var y = dim.legend_mixture_top + dim.legendTitleHeight*2 + spacing_below_title 
                            + phyly_idx*(dim.mixtureClassFontSize + 2);
                    return y;
                })
                .attr("dy", "+0.71em")
                .attr("fill", dim.neutralGrey)
                .attr("font-family", "sans-serif")
                .attr("font-size", dim.mixtureClassFontSize)
                .text(function() { return " - " + phyly; })
                .style("cursor", "default")
                .on("mouseover", function() {
                    if (_checkForSelections(curVizObj)) {
                        var viewSVG = d3.select("#" + view_id);
                        var participating_sites = _.pluck(mixture_classes[phyly], "site_id");

                        // shade view
                        _shadeMainView(curVizObj);

                        // highlight sites
                        _highlightSites(participating_sites, view_id);

                        // highlight general anatomic marks
                        var stems = _.uniq(_.pluck(mixture_classes[phyly], "site_stem"));
                        stems.forEach(function(stem) {
                            d3.select("#" + view_id).select(".generalMark.stem_"+stem)
                                .attr("fill", dim.generalMarkHighlightColour);
                        });

                        // highlight only those links that participate in the mixture classification
                        viewSVG.selectAll(".treeLink").attr("stroke-opacty", 0);
                        participating_sites.forEach(function(participating_site) {
                            viewSVG.selectAll(".treeLink.site_" + participating_site)
                                .attr("stroke-opacity", dim.shadeAlpha);
                            viewSVG.selectAll(".mixtureClassTreeLink.site_"+participating_site)
                                .attr("stroke-opacity", 1);                        
                        });
                    }
                })
                .on("mouseout", function(d) {
                    if (_checkForSelections(curVizObj)) {
                        _resetView(curVizObj);
                    }
                });
        });

        // MUTATION TABLE

        // if mutations are specified by the user
        if (curVizObj.userConfig.mutations != "NA") {

            // make the table
            _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, curVizObj.data.mutations, "Gene Name", 
                dim.mutationTableHeight);
        }

        // FOR EACH SITE

        curVizObj.data.site_ids.forEach(function(site, site_idx) {

            // PLOT SITE-SPECIFIC ELEMENTS (oncoMix, tree, title, anatomic lines, anatomic marks)
            _plotSite(curVizObj, site, drag);            
        });
    },

    resize: function(el, width, height, instance) {

    }

});
