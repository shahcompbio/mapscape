// D3 EFFECTS FUNCTIONS

/* recursive function to perform downstream effects upon tree link highlighting
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} link_id -- id for the link that's currently highlighted
* @param {Array} link_ids -- ids for all links in tree
* @param {String} view_id -- the id for the current view
*/
function _downstreamEffects(curVizObj, link_id, link_ids, view_id) {

    // get target id & single cell id
    var targetRX = new RegExp("legendTreeLink_.+_(.+)");  
    var target_id = targetRX.exec(link_id)[1];

    // highlight the current link in the legend
    d3.select("#" + view_id)
        .select(".legendTreeLink." + link_id)
        .attr("stroke-opacity", 1);

    // highlight the current target node in the legend
    d3.select("#" + view_id)
        .select(".legendTreeNode.clone_" + target_id)
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // highlight those sites showing the moused-over genotype
    var sites = curVizObj.data.genotype_sites[target_id];
    _highlightSites(sites, view_id);

    // highlight the general anatomic marks for those sites showing the moused-over genotype
    sites.forEach(function(site) {
        var stem = _.findWhere(curVizObj.data.sites, {id: site}).stem.siteStem;
        d3.select("#" + view_id)
            .select(".generalMark.stem_" + stem)
            .attr("fill", curVizObj.generalConfig.anatomicLineColour);
    })

    // get the targets of this target
    var sourceRX = new RegExp("legendTreeLink_" + target_id + "_(.+)");
    var targetLinks_of_targetNode = [];
    link_ids.map(function(id) {
        if (id.match(sourceRX)) {
            targetLinks_of_targetNode.push(id);
        }
    });

    // for each of the target's targets, highlight their downstream links
    targetLinks_of_targetNode.map(function(target_link_id) {
        _downstreamEffects(curVizObj, target_link_id, link_ids, view_id);
    });
};

/* function for highlighting genotype on anatomic image
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} cur_gtype -- genotype on hover
* @param {String} view_id -- the id for the current view
*/
function _legendGtypeHighlight(curVizObj, cur_gtype, view_id) {
    // hide anatomic general marks
    d3.select("#" + view_id).selectAll(".generalMark").attr("fill-opacity", 0).attr("stroke-opacity", 0);

    // highlight genotype on legend tree
    d3.select("#" + view_id).selectAll(".legendTreeNode.clone_" + cur_gtype).attr("fill-opacity", 1).attr("stroke-opacity", 1);

    // highlight genotype on anatomic image
    d3.select("#" + view_id).selectAll(".gtypeMark.clone_" + cur_gtype).attr("fill-opacity", 1).attr("stroke-opacity", 1);
}

/* function to shade all elements of the main view
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} view_id -- the id for the current view
*/
function _shadeMainView(curVizObj, view_id) {
    var dim = curVizObj.generalConfig;

    d3.select("#" + view_id).selectAll(".voronoiCell")
        .attr("fill-opacity", dim.shadeAlpha)
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".treeNode")
        .attr("fill-opacity", dim.shadeAlpha)
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".treeLink")
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".siteTitle")
        .attr("fill-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".anatomicPointer")
        .attr("stroke-opacity", 0.25);
}

/* function for view reset
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} view_id -- the id for the current view
*/
function _resetView(curVizObj, view_id) {
    var dim = curVizObj.generalConfig;

    // reset anatomic marks
    d3.select("#" + view_id).selectAll(".gtypeMark").attr("fill-opacity", 0);
    d3.select("#" + view_id).selectAll(".generalMark").attr("fill", "white").attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // reset legend tree nodes & links
    d3.select("#" + view_id).selectAll(".legendTreeNode").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".legendTreeLink").attr("fill-opacity", 1).attr("stroke-opacity", 1)
        .attr("stroke", dim.neutralGrey);

    // reset all elements of main view
    d3.select("#" + view_id).selectAll(".voronoiCell").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".treeNode").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".treeLink").attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".siteTitle").attr("fill-opacity", 1);
    d3.select("#" + view_id).selectAll(".anatomicPointer").attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".mixtureClassTreeLink").attr("stroke-opacity", 0);
}

/* function to highlight certain sites in the view
* @param {Array} site_ids -- site ids to highlight
* @param {String} view_id -- the id for the current view
*/
function _highlightSites(site_ids, view_id) {
    site_ids.forEach(function(site) {
        d3.select("#" + view_id).selectAll(".voronoiCell.site_" + site).attr("fill-opacity", 1).attr("stroke-opacity", 1);
        d3.select("#" + view_id).selectAll(".treeNode.site_" + site).attr("fill-opacity", 1).attr("stroke-opacity", 1);
        d3.select("#" + view_id).selectAll(".treeLink.site_" + site).attr("stroke-opacity", 1);
        d3.select("#" + view_id).selectAll(".siteTitle.site_" + site).attr("fill-opacity", 1);
        d3.select("#" + view_id).selectAll(".anatomicPointer.site_" + site).attr("stroke-opacity", 1)
    })
}

/* function during drag event
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
* @param {String} cur_site -- current site being dragged
* @param {Object} d -- data object for current site svg group
* @param {String} view_id -- the id for the current view
*/
function _dragFunction(curVizObj, cur_site, d, view_id) {
    var dim = curVizObj.generalConfig;

    // calculate angle w/the positive x-axis, formed by the line segment between the mouse & view centre
    var angle = _find_angle_of_line_segment(
                    {x: d3.event.x, y: d3.event.y},
                    {x: dim.viewCentre.x, y: dim.viewCentre.y});

    // move anatomic pointer
    d3.select("#" + view_id).select(".anatomicPointer.site_"+cur_site)
        .attr("x1", function(d) {
            return _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle).x;
        })
        .attr("y1", function(d) {
            return _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle).y;
        })

    // move oncoMix
    d3.select("#" + view_id).select(".oncoMixG.site_"+cur_site)
        .attr("transform", function(d) {
            var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle);
            return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
        });

    // move tree 
    d3.select("#" + view_id).select(".treeG.site_"+cur_site)
        .attr("transform", function(d) {
            var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, angle);
            return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
        }); 

    // move site title
    d3.select("#" + view_id).select(".siteTitle.site_"+cur_site)
        .attr("transform", function(d) {
            var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + Math.pow(d.y - dim.viewCentre.y, 2)),
                point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
            return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
        });    
}

// ANATOMY IMAGE FUNCTIONS

/* function to get proportional anatomic locations on the anatomic diagram
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _getSiteLocationsOnImage(curVizObj) {
    // female anatomy
    if (curVizObj.userConfig.gender == "F") {
        curVizObj.view.siteLocationsOnImage = [
            {siteStem: "Om", x: 0.503, y: 0.40},
            {siteStem: "RFT", x: 0.482, y: 0.435},
            {siteStem: "LFT", x: 0.524, y: 0.435},
            {siteStem: "ROv", x: 0.483, y: 0.450},
            {siteStem: "LOv", x: 0.523, y: 0.450},
            {siteStem: "Cds", x: 0.503, y: 0.470},
            {siteStem: "Cln", x: 0.503, y: 0.478},
            {siteStem: "Adnx", x: 0.503, y: 0.474},
            {siteStem: "RPv", x: 0.469, y: 0.454},
            {siteStem: "LPv", x: 0.537, y: 0.454},
            {siteStem: "Brn", x: 0.503, y: 0.05},
            {siteStem: "Bwl", x: 0.503, y: 0.415},
            {siteStem: "SBwl", x: 0.503, y: 0.42},
            {siteStem: "Ap", x: 0.483, y: 0.475},
            {siteStem: "RUt", x: 0.493, y: 0.482},
            {siteStem: "LUt", x: 0.513, y: 0.482}
        ]        
    }
    // male anatomy
    else {
        curVizObj.view.siteLocationsOnImage = [
            {siteStem: "Om", x: 0.503, y: 0.40},
            {siteStem: "Cln", x: 0.503, y: 0.478},
            {siteStem: "RPv", x: 0.459, y: 0.454},
            {siteStem: "LPv", x: 0.547, y: 0.454},
            {siteStem: "Brn", x: 0.503, y: 0.05},
            {siteStem: "Bwl", x: 0.503, y: 0.415},
            {siteStem: "SBwl", x: 0.503, y: 0.42},
            {siteStem: "Ap", x: 0.483, y: 0.475},
        ]
    }
}

/* function to assign site stems (e.g. "Om") to site ids (e.g. "Om1"), and vice versa
* Note: "stem" = anatomic site stem (e.g. "Om")
*       "id" = site id (e.g. "Om1")
* @param {Object} curVizObj -- vizObj for the current view 
*/
function _assignAnatomicLocations(curVizObj) {

    // keep track of stems in this dataset, and their corresponding site ids
    curVizObj.data.siteStems = {};

    curVizObj.data.sites = [];

    // for each site in the data
    curVizObj.data.site_ids.forEach(function(site_id) {
        var site_data = {id: site_id};

        // for each potential stem
        for (var i = 0; i < curVizObj.view.siteLocationsOnImage.length; i++) {
            var cur_location = curVizObj.view.siteLocationsOnImage[i];

            // if this stem is applicable to the current site id
            var siteStem = cur_location.siteStem;
            if (site_id.toLowerCase().startsWith(siteStem.toLowerCase())) {

                // add the stem data to the site id data
                site_data.stem = cur_location;

                // add this site id to the stems data
                if (curVizObj.data.siteStems[siteStem]) {
                    curVizObj.data.siteStems[siteStem].site_ids.push(site_id);
                }
                else {
                    curVizObj.data.siteStems[siteStem] = cur_location;
                    curVizObj.data.siteStems[siteStem].site_ids = [site_id];
                }

                break;
            }

            // no site found - throw warning
            if (i == curVizObj.view.siteLocationsOnImage.length-1) {
                console.warn("No corresponding anatomic site found for site \"" + site_id + "\".")
            }
        }

        // add this site to list of sites
        curVizObj.data.sites.push(site_data);
    })
}

/* function to get image bounds for the anatomic data in this dataset
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getImageBounds(curVizObj) {
    var min_x = Infinity,
        max_x = -1
        min_y = Infinity,
        max_y = -1;

    Object.keys(curVizObj.data.siteStems).forEach(function(siteStem) {
        var cur_siteStem = curVizObj.data.siteStems[siteStem];
        if (min_x > cur_siteStem.x) {
            min_x = cur_siteStem.x;
        }
        if (min_y > cur_siteStem.y) {
            min_y = cur_siteStem.y;
        }
        if (max_x < cur_siteStem.x) {
            max_x = cur_siteStem.x;
        }
        if (max_y < cur_siteStem.y) {
            max_y = cur_siteStem.y;
        }
    })

    curVizObj.view.imageBounds = {
        min_x: min_x,
        min_y: min_y,
        max_x: max_x,
        max_y: max_y
    }
}

/* function to scale an image 
* @param {Object} curVizObj -- vizObj for the current view
*/
function _scale(curVizObj) {

    var anatomy_padding = 0.05; // 5% of the image
    var original_width = curVizObj.generalConfig.image_plot_width;

    // get the width (width == height) of the cropped section
    var bounds = curVizObj.view.imageBounds;
    var crop_width_prop = ((bounds.max_x - bounds.min_x) > (bounds.max_y - bounds.min_y)) ? 
        (bounds.max_x - bounds.min_x + anatomy_padding*2) :
        (bounds.max_y - bounds.min_y + anatomy_padding*2);
    var crop_width = crop_width_prop*curVizObj.generalConfig.image_plot_width; 

    // scaling factor
    var scaling_factor = crop_width/original_width; 

    // new height == new width (must blow up the image by the scaling factor)
    var new_width = (original_width/scaling_factor); 

    // fractional centre of original image
    var centre = {
        x: ((bounds.max_x + bounds.min_x)/2), 
        y: ((bounds.max_y + bounds.min_y)/2)
    };

    // amount to shift left and up ([0,1], then absolute)
    var left_shift_prop = (centre.x - crop_width_prop/2);
    var up_shift_prop = (centre.y - crop_width_prop/2);
    var left_shift = left_shift_prop*new_width;
    var up_shift = up_shift_prop*new_width;

    var crop_info = {
        crop_width_prop: crop_width_prop,
        new_width: new_width,
        left_shift: left_shift,
        up_shift: up_shift,
        left_shift_prop: left_shift_prop,
        up_shift_prop: up_shift_prop,
        centre_prop: centre
    }

    // get cropped absolute x, y coordinates for each site stem
    Object.keys(curVizObj.data.siteStems).forEach(function(stem) {
        curVizObj.data.siteStems[stem]["cropped_coords"] = _getCroppedCoordinate(
                                                                crop_info, 
                                                                curVizObj.data.siteStems[stem],
                                                                curVizObj.generalConfig.image_top_l,
                                                                curVizObj.generalConfig.image_plot_width
                                                            );
    })

    return crop_info;
}

/* function to transform a coordinate to its cropped equivalent on the anatomy image
* @param {Object} crop_info -- cropping onformation (shifts, width, etc.)
* @param {Object} prop -- object with x- and y-coordinates [0,1] on original image (properties "x", "y")
* @param {Object} top_l -- absolute x- and y-coordinates for the top left of the plotting area (properties "x", "y")
* @param {Number} plot_width -- absolute width for the plotting area
* @return absolute coordinates
*/
function _getCroppedCoordinate(crop_info, prop, top_l, plot_width) {
    var cropped_x_prop = (prop.x - crop_info.left_shift_prop)/crop_info.crop_width_prop;
    var cropped_y_prop = (prop.y - crop_info.up_shift_prop)/crop_info.crop_width_prop;

    var cropped_coordinates = {
        x: top_l.x + (cropped_x_prop*plot_width), 
        y: top_l.y + (cropped_y_prop*plot_width)
    };
    return cropped_coordinates;
}

// TREE FUNCTIONS

/* extract all info from tree about nodes, edges, ancestors, descendants
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _getTreeInfo(curVizObj) {
    var userConfig = curVizObj.userConfig,
        rootName = 'Root',
        cur_edges = userConfig.tree_edges;

    // get tree nodes
    curVizObj.data.treeNodes = _.uniq(_.pluck(cur_edges, "source").concat(_.pluck(cur_edges, "target")));

    // get tree edges
    curVizObj.data.treeEdges = [];
    for (var i = 0; i < cur_edges.length; i++) {
        curVizObj.data.treeEdges.push({
            "source": cur_edges[i].source,
            "target": cur_edges[i].target
        })
    }

    // get tree structure
    var nodesByName = [];
    for (var i = 0; i < curVizObj.data.treeEdges.length; i++) {
        var parent = _findNodeByName(nodesByName, curVizObj.data.treeEdges[i].source);
        var child = _findNodeByName(nodesByName, curVizObj.data.treeEdges[i].target);
        parent["children"].push(child);
    }
    var root_tree = _findNodeByName(nodesByName, rootName); 
    curVizObj.data.treeStructure = root_tree; 

    // get descendants for each node
    curVizObj.data.treeDescendantsArr = {};
    curVizObj.data.treeNodes.forEach(function(node, idx) {
        var curRoot = _findNodeByName(nodesByName, node);
        var curDescendants = _getDescendantIds(curRoot, []);
        curVizObj.data.treeDescendantsArr[node] = curDescendants;
    })
    curVizObj.data.direct_descendants = _getDirectDescendants(curVizObj.data.treeStructure, {});

    // get ancestors for each node
    curVizObj.data.treeAncestorsArr = _getAncestorIds(curVizObj);
    curVizObj.data.direct_ancestors = _getDirectAncestors(curVizObj.data.treeStructure, {});

    // get the height of the tree
    curVizObj.data.tree_height = 0;
    Object.keys(curVizObj.data.treeAncestorsArr).forEach(function(key) {
        var ancestor_arr = curVizObj.data.treeAncestorsArr[key];
        if (ancestor_arr.length > curVizObj.data.tree_height) {
            curVizObj.data.tree_height = ancestor_arr.length;
        }
    })
}

/* function to get the "most recent" common ancestor for a list of genotypes
* (this function could return one of the genotypes itself)
* @param {Object} curVizObj -- vizObj for the current view
* @param {Array} gtypes -- genotypes for which we want a common ancestor
*/
function _getMRCA(curVizObj, gtypes) {
    var ancestorsList = []; // list of ancestors for each genotype
    gtypes.forEach(function(gtype) {
        // the current genotype and its ancestors
        var gtype_and_ancestors = $.extend([], curVizObj.data.treeAncestorsArr[gtype]);
        gtype_and_ancestors.push(gtype);

        ancestorsList.push(gtype_and_ancestors);
    })

    // common ancestors between the two genotypes
    var common_ancestors = _getIntersectionManyArrays(ancestorsList);

    // determine the common ancestor with the most ancestors itself (will be the MRCA)
    var most_ancestors = -1;
    var MRCA = "NA";
    common_ancestors.forEach(function(anc) {
        var n_ancestors = curVizObj.data.treeAncestorsArr[anc].length;
        if (n_ancestors > most_ancestors) {
            most_ancestors = n_ancestors;
            MRCA = anc;
        }
    })

    return MRCA;
}

/* function to get the DIRECT ancestor id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_ancestors -- originally empty array of direct descendants for each node
*/
function _getDirectAncestors(curNode, dir_ancestors) {

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_ancestors[curNode.children[i].id] = curNode.id;
            _getDirectAncestors(curNode.children[i], dir_ancestors)
        }
    }

    return dir_ancestors;
}

/* function to get the DIRECT descendant id for all nodes
* @param {Object} curNode -- current node in the tree (originally the root)
* @param {Object} dir_descendants -- originally empty array of direct descendants for each node
*/
function _getDirectDescendants(curNode, dir_descendants) {
    dir_descendants[curNode.id] = [];

    if (curNode.children.length > 0) {
        for (var i = 0; i < curNode.children.length; i++) {
            dir_descendants[curNode.id].push(curNode.children[i].id);
            _getDirectDescendants(curNode.children[i], dir_descendants)
        }
    }

    return dir_descendants;
}

/* function to get descendants id's for the specified key
* @param {Object} root - key for which we want descendants
* @param {Array} descendants - initially empty array for descendants to be placed into
*/
function _getDescendantIds(root, descendants) {
    var child;

    if (root["children"].length > 0) {
        for (var i = 0; i < root["children"].length; i++) {
            child = root["children"][i];
            descendants.push(child["id"]);
            _getDescendantIds(child, descendants);
        }
    }
    return descendants;
}

/* function to get the ancestor ids for all nodes
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getAncestorIds(curVizObj) {
    var ancestors = {},
        curDescendants,
        descendants_arr = curVizObj.data.treeDescendantsArr,
        treeNodes = curVizObj.data.treeNodes;

    // set up each node as originally containing an empty list of ancestors
    treeNodes.forEach(function(node, idx) {
        ancestors[node] = [];
    })

    // get ancestors data from the descendants data
    treeNodes.forEach(function(node, idx) {
        // for each descendant of this node
        curDescendants = descendants_arr[node];
        for (var i = 0; i < curDescendants.length; i++) { 
            // add the node to descentant's ancestor list
            ancestors[curDescendants[i]].push(node);
        }
    })

    return ancestors;
}

/* function to find a key by its name - if the key doesn't exist, it will be created and added to the list of nodes
* @param {Array} list - list of nodes
* @param {String} name - name of key to find
*/
function _findNodeByName(list, name) {
    var foundNode = _.findWhere(list, {id: name}),
        curNode;

    if (!foundNode) {
        curNode = {'id': name, 'children': []};
        list.push(curNode);
        return curNode;
    }

    return foundNode;
}

/* elbow function to draw phylogeny links 
*/
function _elbow(d) {
    return "M" + d.source.x + "," + d.source.y
        + "H" + (d.source.x + (d.target.x-d.source.x)/2)
        + "V" + d.target.y + "H" + d.target.x;
}

/* elbow function to draw phylogeny links 
*/
function _shortElbow(d) {
    return "M" + (d.source.x + (d.target.x-d.source.x)/2) + "," + d.source.y
        + "V" + d.target.y + "H" + d.target.x;
}

/*
* function to, using the tree hierarchy, get the linear segments' starting key and length (including starting key)
* @param {Object} curNode -- current key in the tree
* @param {Object} chains -- originally empty object of the segments 
*                           (key is segment start key, value is array of descendants in this chain)
* @param {Object} base -- the base key of this chain
*/
function _getLinearTreeSegments(curNode, chains, base) {

    // if it's a new base, create the base, with no descendants in its array yet
    if (base == "") {
        base = curNode.id;
        chains[base] = [];
    }
    // if it's a linear descendant, append the current key to the chain
    else {
        chains[base].push(curNode.id);
    }

    // if the current key has 1 child to search through
    if (curNode.children.length == 1) { 
        _getLinearTreeSegments(curNode.children[0], chains, base);
    }

    // otherwise for each child, create a blank base (will become that child)
    else {
        for (var i = 0; i < curNode.children.length; i++) {
            _getLinearTreeSegments(curNode.children[i], chains, "");
        }
    }

    return chains;
}

/* function to get sites affected by each link (link identified here by its target clone id)
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getSitesAffectedByLink(curVizObj) {
    var affected_sites = {};

    // for each clone
    curVizObj.data.treeNodes.forEach(function(clone) {
        var cur_affected_sites = [];

        // the clone and its descendants
        var gtypeAndDescendants = curVizObj.data.treeDescendantsArr[clone];
        gtypeAndDescendants.push(clone);

        // for each of its descendants (and itself)
        gtypeAndDescendants.forEach(function(desc) {

            // append the sites affected by that descendant
            cur_affected_sites = cur_affected_sites.concat(curVizObj.data.genotype_sites[desc]);
        });

        affected_sites[clone] = _.uniq(cur_affected_sites);
    })

    curVizObj.data.link_affected_sites = affected_sites;
}

// COLOUR FUNCTIONS

/*
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getColours(curVizObj) {
    var colour_assignment = {}, // standard colour assignment
        cur_colours = curVizObj.userConfig.clone_cols;

    // clone colours specified
    if (cur_colours != "NA") {
        // get colour assignment - use specified colours
        // handling different inputs -- TODO should probably be done in R
        cur_colours.forEach(function(col, col_idx) {
            var col_value = col.colour;
            if (col_value[0] != "#") { // append a hashtag if necessary
                col_value = "#".concat(col_value);
            }
            if (col_value.length > 7) { // remove any alpha that may be present in the hex value
                col_value = col_value.substring(0,7);
            }
            colour_assignment[col.clone_id] = col_value;
        });
        colour_assignment['Root'] = curVizObj.generalConfig.rootColour;
    }

    // clone colours not specified
    else {
        var colour_palette = _getColourPalette(),
            chains = _getLinearTreeSegments(curVizObj.data.treeStructure, {}, "");
        colour_assignment = _colourTree(curVizObj, chains, curVizObj.data.treeStructure, 
            colour_palette, {}, "Greys", $.extend({}, colour_palette));
    }
    curVizObj.view.colour_assignment = colour_assignment;  

}

/* function to get a colour palette
*/
function _getColourPalette() {

    var colours = {
        "Reds": 
            ["#df6a62", "#F8766D", "#f8837b", "#f9918a", "#fa9f99", "#fbada7", "#fcbbb6", "#fcc8c5", 
            "#fdd6d3", "#fee4e2"].reverse(),
        "Greens":
            ["#53B400", "#64bb19", "#75c333", "#86ca4c", "#98d266", "#a9da80", "#bae199", "#cce9b3", 
            "#ddf0cc", "#eef8e6"].reverse(),
        "Pinks":
            ["#FB61D7", "#f870db", "#f980df", "#fa90e3", "#fba0e7", "#fcb0eb", "#fcc0ef", "#fdd0f3", 
            "#fee0f7", "#fff0fb"].reverse(),
        "Turquoises":
            ["#00C094", "#19c69e", "#33cca9", "#4cd3b4", "#66d9bf", "#80e0ca", "#99e6d4", "#b3ecdf", 
            "#ccf3ea", "#e6f9f5"].reverse(),
        "Oranges":
            ["#FF8D15", "#ff982c", "#ffa444", "#ffaf5b", "#ffbb73", "#ffc68a", "#ffd2a2", "#ffddb9", 
            "#ffe9d1", "#fff4e8"].reverse(),
        "Purples":
            ["#A58AFF", "#ae95ff", "#b7a1ff", "#c0adff", "#c9b9ff", "#d2c5ff", "#dbd0ff", "#e4dcff", 
            "#ede8ff", "#f6f4ff"].reverse(),
        "Blues":
            ["#00B6EB", "#19bded", "#33c4ef", "#4cccf1", "#66d3f3", "#80dbf5", "#99e2f7", "#b3e9f9", 
            "#ccf1fb", "#e6f8fd"].reverse(),
        "Yellows":
            ["#C49A00","#caa419", "#d0ae33", "#d6b84c", "#dcc266", "#e2cd80", "#e8d799", "#eee1b3", 
            "#f4ebcc", "#faf5e6"].reverse(),
        "Browns":
            ["#91553A", "#9c664d", "#a77761", "#b28875", "#bd9989", "#c8aa9d", "#d3bbb0", "#deccc4", 
            "#e9ddd8", "#f4eeec"].reverse(),
        "Greys":
            ["#CBCBCB", "#d0d0d0", "#d5d5d5", "#dadada", "#e0e0e0", "#e5e5e5", "#eaeaea", "#f0f0f0", 
            "#f5f5f5", "#fafafa"]
    }

    return colours;
}

/*
* function to, using the tree hierarchy, get appropriate colours for each genotype
* @param {Object} curVizObj -- vizObj for the current view
* @param {Object} chains -- the linear segments (chains) in the genotype tree 
*                           (key is segment start key, value is array of descendants in this chain)
* @param {Object} curNode -- current key in the tree
* @param {Array} palette -- (modified throughout function) colour themes to choose from
* @param {Object} colour_assignment -- originally empty array of the final colour assignments
* @param {String} curTheme -- the colour theme currently in use
* @param {Array} originalPalette -- (original array) colour themes to choose from
*/
function _colourTree(curVizObj, chains, curNode, palette, colour_assignment, curTheme, originalPalette) {

    // colour node
    if (curNode.id == "Root") {
        colour_assignment[curNode.id] = curVizObj.generalConfig.rootColour; // dark grey
    }
    else {
        colour_assignment[curNode.id] = palette[curTheme].shift();
    }

    // if the current key has zero or >1 child to search through
    if (curNode.children.length != 1 && curNode.id != "Root") { 

        // remove its colour theme from the colour themes available
        delete palette[curTheme];

    }

    // if the palette is finished, start again
    if (Object.keys(palette).length == 0) {
        console.warn("Colour palette isn't big enough to accommodate this dataset - for optimal colours, " +
            "provide your own as an input parameter in R ('clone_colours' parameter).")
        palette = $.extend({}, originalPalette);
        curTheme = Object.keys(palette)[0];            
    }
        
    // if the current key has one child only
    if (curNode.children.length == 1) {

        // colour child with the same theme as its parent
        _colourTree(curVizObj, chains, curNode.children[0], palette, colour_assignment, curTheme, originalPalette)
    }

    // otherwise
    else {
        // reorder the children according to their emergent cellular prevalence
        var tmpChildren = $.extend([], curNode.children);
        
        // for each child
        for (var i = 0; i < tmpChildren.length; i++) {

            // give it a new colour theme
            curTheme = Object.keys(palette)[0];

            // modify the colour palette to contain the most contrasting colours
            var n = chains[tmpChildren[i].id].length+1; // + 1 to include the base key (this child)
            var tmp_palette = [];
            if (n == 1) { // if there's only one item in this chain, set it to a bright colour (not the darkest)
                tmp_palette.push(palette[curTheme][7]);
            }
            else {
                for (var j = 8; j >= 0; j -= Math.floor(9/n)) {
                    tmp_palette.push(palette[curTheme][j]);
                }
            }
            palette[curTheme] = tmp_palette;

            // colour child
            _colourTree(curVizObj, chains, tmpChildren[i], palette, colour_assignment, curTheme, originalPalette)
        }
    }

    return colour_assignment;
}

// function to decrease brightness of hex colour
// from: http://stackoverflow.com/questions/12660919/javascript-brightness-function-decrease
function _decrease_brightness(hex, percent){
    var r = parseInt(hex.substr(1, 2), 16),
        g = parseInt(hex.substr(3, 2), 16),
        b = parseInt(hex.substr(5, 2), 16);

   return '#' +
       ((0|(1<<8) + r * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g * (100 - percent) / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b * (100 - percent) / 100).toString(16)).substr(1);
}

// CELLULAR PREVALENCE FUNCTIONS

/* function to get the cellular prevalence data in a better format 
* (properties at level 1 is site, at level 2 is gtype)
*/
function _getCPData(curVizObj) {
    var clonal_prev = curVizObj.userConfig.clonal_prev;

    // for each time point, for each genotype, get cellular prevalence
    var cp_data = {};
    $.each(clonal_prev, function(idx, hit) { // for each hit (genotype/site_id combination)

        cp_data[hit["site_id"]] = cp_data[hit["site_id"]] || {};
        cp_data[hit["site_id"]][hit["clone_id"]] = {};
        cp_data[hit["site_id"]][hit["clone_id"]]["cp"] = parseFloat(hit["clonal_prev"]); 
    });

    curVizObj.data.cp_data = cp_data;
}

/* function to threshold and adjust cellular prevalences 
* (genotypes with small cellular prevalences will not be plotted;
* the rest will be adjusted such that the sum of adjusted CPs is 1)
* @param {Object} curVizObj -- vizObj for the current view 
*/
function _thresholdCPData(curVizObj) {

    curVizObj.data.site_ids.forEach(function(site) {

        // threshold the cellular prevalence 

        var threshold = 0.01;
        var total_legit_cp = 0; // the total sum of cellular prevalence after filtering out those below threshold
        Object.keys(curVizObj.data.cp_data[site]).forEach(function(gtype) {

            var cur_cp = curVizObj.data.cp_data[site][gtype].cp;

            // only add genotypes that will be exhibited in >1 cell
            if (cur_cp > threshold) {
                total_legit_cp += curVizObj.data.cp_data[site][gtype].cp;
            }
            // warn if this genotype will not be shown
            else {
                console.warn("At anatomic site " + site + ", genotype " + gtype + " has cellular prevalence " +
                    "less than the minimum for this view, and will not be shown.");
            }
        });

        // adjust cellular prevalence values to sum to 1

        curVizObj.data["site_genotypes"] = curVizObj.data["site_genotypes"] || {};
        curVizObj.data["site_genotypes"][site] = []; // which genotypes to show for this site
        Object.keys(curVizObj.data.cp_data[site]).forEach(function(gtype) {

            var cur_cp = curVizObj.data.cp_data[site][gtype].cp;

            // only add genotypes that will be exhibited in >1 cell
            if (cur_cp > threshold) {
                curVizObj.data.cp_data[site][gtype].adj_cp = cur_cp/total_legit_cp;
                curVizObj.data["site_genotypes"][site].push(gtype);
            }
        });
    });
}

/* function to get, for each genotype, the sites expressing that genotype
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _getGenotypeSites(curVizObj) {
    // each site (1st level property) has an array of genotypes at that site
    var site_genotypes = curVizObj.data.site_genotypes,
        genotype_sites = {};

    curVizObj.data.treeNodes.forEach(function(gtype) {
        var sites_containing_gtype = [];
        Object.keys(curVizObj.data.site_genotypes).forEach(function(site) {
            if (curVizObj.data.site_genotypes[site].indexOf(gtype) != -1) {
                sites_containing_gtype.push(site);
            }
        });
        genotype_sites[gtype] = sites_containing_gtype;
    })

    curVizObj.data.genotype_sites = genotype_sites;
}

// VORONOI FUNCTIONS

function _polygon(d) {
  return "M" + d.join("L") + "Z";
}

/* function to get voronoi vertices for this anatomic site (randomly fill a rectangle, keeping all within a certain 
* radius from the centre as "real cells", all others as "fake cells") 
* @param {Object} curVizObj -- vizObj for the current view 
* @param {Number} cx -- x-coordinate at centre of oncoMix
* @param {Number} cy -- y-coordinate at centre of oncoMix
*/
function _getVoronoiVertices(curVizObj, cx, cy) {
    var dim = curVizObj.generalConfig;

    // voronoi vertices 
    var circleRadius = dim.oncoMixWidth*1/3;
    var n_real_cells = 1;
    var vertices = [];
    while (n_real_cells <= curVizObj.userConfig.n_cells) {
        var x = (cx - dim.oncoMixWidth/2) + (Math.random() * dim.oncoMixWidth);
        var y = (cy - dim.oncoMixWidth/2) + (Math.random() * dim.oncoMixWidth);
        var dist = Math.sqrt(Math.pow(x-cx, 2) + Math.pow(y-cy, 2));
        var inside_circle = (dist < circleRadius);
        if (inside_circle) {
            n_real_cells++;
        }
        vertices.push({x: x, y: y, real_cell: inside_circle});
    }

    // sort vertices
    vertices.sort(function(a, b) { 
        if ((a.x > b.x) && (a.y > b.y)) {
            return 1;
        }
        else {
            return -1;
        };
    });
    vertices.sort(function(a, b) { 
        if ((a.x > b.x) && (a.y < b.y)) {
            return 1;
        }
        else {
            return -1;
        };
    });

    return vertices;
}

/* function to add colour (genotype) information to each vertex for this anatomic site
* @param {Object} curVizObj -- vizObj for the current view 
* @param {String} site -- current anatomic site of interest
* @param {Array} vertices -- array of voronoi vertices objects (properties: x, y, real_cell) for this site 
*/
function _addGtypeInfoToVertices(curVizObj, site, vertices) {

    var gtypes = curVizObj.data["site_genotypes"][site], // genotypes to plot for this site
        cumulative_cp = curVizObj.data.cp_data[site][gtypes[0]].adj_cp, // cumulative CP thus far
        gtype_i = 0, // index of the current genotype to show
        cur_gtype, // current genotype
        n_real_cells = 1; // # real cells seen

    // for each vertex    
    vertices.forEach(function(v, i) {

        cur_gtype = gtypes[gtype_i];

        // if this is a real cell
        if (v.real_cell) {

            // if the current genotype has been allocated enough cells, advance one genotype
            if (n_real_cells/curVizObj.userConfig.n_cells > Math.round(cumulative_cp * 100)/100) {
                cur_gtype = gtypes[++gtype_i]; // update current genotype
                cumulative_cp += curVizObj.data.cp_data[site][cur_gtype].adj_cp; // update cumulative CP
            }

            // note colour for this vertex, based on appropriate genotype
            v.col = curVizObj.view.colour_assignment[cur_gtype];

            // we've seen another real cell
            n_real_cells++;
        }
    })

    return vertices;
}

// LAYOUT FUNCTIONS

/* function to get coordinates for a point evenly spaced around circle perimeter
* from: http://stackoverflow.com/questions/24273990/calculating-evenly-spaced-points-on-the-perimeter-of-a-circle
* @param {Number} cx -- x-coordinate at centre of the circle
* @param {Number} cy -- y-coordinate at centre of the circle
* @param {Number} r -- radius of the circle
* @param {Number} currentPoint -- index of current point 
* @param {Number} totalPoints -- total number of points to evenly space around circle
*/
function _drawPoint(cx, cy, r, currentPoint, totalPoints) {  

    var theta = ((Math.PI*2) / totalPoints);
    var angle = (theta * currentPoint); // - Math.PI/2;

    var x = cx + (r * Math.cos(angle));
    var y = cy + (r * Math.sin(angle));

    return {x: x, y: y, theta: theta, angle: angle};
}

/* function to get coordinates for a point given an angle aroud a circle
* modified from: 
*    http://stackoverflow.com/questions/24273990/calculating-evenly-spaced-points-on-the-perimeter-of-a-circle
* @param {Number} cx -- x-coordinate at centre of the circle
* @param {Number} cy -- y-coordinate at centre of the circle
* @param {Number} angle -- angle from positive x-axis
*/
function _drawPointGivenAngle(cx, cy, r, angle) {  

    var x = cx + (r * Math.cos(angle));
    var y = cy + (r * Math.sin(angle));

    return {x: x, y: y};
}


/* function to get positions of site tab, dividers, voronoi tesselation centre, tree centre for each site
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getSitePositioning(curVizObj) {
    var dim = curVizObj.generalConfig,
        n_sites = curVizObj.data.site_ids.length; // number of sites

    // for each site
    curVizObj.data.sites.forEach(function(cur_site_obj, site_idx) {
        var site_id = cur_site_obj.id;

        // left divider
        cur_site_obj["leftDivider"] = {
            x1: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.innerRadius, site_idx, n_sites).x,
            y1: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.innerRadius, site_idx, n_sites).y,
            x2: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius - 2, site_idx, n_sites).x,
            y2: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius - 2, site_idx, n_sites).y
        }

        // VORONOI

        // voronoi placement
        cur_site_obj["voronoi"] = {};
        cur_site_obj["voronoi"]["centre"] = {
            x: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, site_idx+0.5, n_sites).x,
            y: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, site_idx+0.5, n_sites).y
        }
        cur_site_obj["voronoi"]["top_l_corner"] = {
            x: cur_site_obj["voronoi"]["centre"].x - dim.oncoMixWidth/2,
            y: cur_site_obj["voronoi"]["centre"].y - dim.oncoMixWidth/2
        }

        // voronoi vertices (randomly fill a rectangle, keeping all within a certain 
        // radius from the centre as "real cells", all others as "fake cells")
        var vertices = _getVoronoiVertices(
                curVizObj, 
                cur_site_obj["voronoi"]["centre"].x,
                cur_site_obj["voronoi"]["centre"].y
            );

        // add colour (genotype) information to each vertex
        cur_site_obj["voronoi"]["vertices"] = _addGtypeInfoToVertices(curVizObj, 
                                                                        site_id, 
                                                                        vertices);

        // 2D array of x- and y- positions for vertices
        cur_site_obj["voronoi"]["vertex_coords"] = vertices.map(function(vertex) {
            return [vertex.x, vertex.y];
        });

        // TAB 

        //placement
        cur_site_obj["tab"] = {
            startAngle: 
                _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, site_idx+0.05, n_sites).angle 
                + Math.PI/2, // not sure why it's shifted by 90 degrees..
            endAngle: 
                _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, site_idx+0.95, n_sites).angle 
                + Math.PI/2
        };

        // MIDDLE ANGLE
        cur_site_obj["angle"] = 
            (_drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, site_idx+0.05, n_sites).angle +
            _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, site_idx+0.95, n_sites).angle)/2;


        // TREE

        cur_site_obj["tree"] = {};
        cur_site_obj["tree"]["centre"] = {
            x: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, site_idx+0.5, n_sites).x,
            y: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, site_idx+0.5, n_sites).y
        }
        cur_site_obj["tree"]["top_l_corner"] = {
            x: cur_site_obj["tree"]["centre"].x - dim.treeWidth/2,
            y: cur_site_obj["tree"]["centre"].y - dim.treeWidth/2
        }
        cur_site_obj["tree"]["top_middle"] = {
            x: cur_site_obj["tree"]["centre"].x,
            y: cur_site_obj["tree"]["centre"].y - dim.treeWidth/2
        }
        cur_site_obj["tree"]["bottom_middle"] = {
            x: cur_site_obj["tree"]["centre"].x,
            y: cur_site_obj["tree"]["centre"].y + dim.treeWidth/2
        }

        // PURE, MONOPHYLETIC, OR POLYPHYLETIC SITE
        var phyly;
        var site_gtypes = curVizObj.data["site_genotypes"][site_id];
        // pure tumour
        if (site_gtypes.length == 1) {
            phyly = "pure";
        }
        // monophyletic tumour
        else {
            for (var i = 0; i < site_gtypes.length; i++) {
                var gtypeAndAncestors = curVizObj.data.treeAncestorsArr[site_gtypes[i]].slice();
                gtypeAndAncestors.push(site_gtypes[i]);
                if (_getIntersection(gtypeAndAncestors, site_gtypes).length == site_gtypes.length) {
                    phyly = "monophyletic";
                }
            }
        }
        // polyphyletic tumour
        if (["monophyletic","pure"].indexOf(phyly) == -1) {
            phyly = "polyphyletic";
        }
        cur_site_obj["phyly"] = phyly;
    })
}

/*
* Calculates the angle AB forms with the positive x-axis (in radians) 
* modified from: http://stackoverflow.com/questions/17763392/how-to-calculate-in-javascript-angle-between-3-points
*
* A mouse coordinates
* B centre of circle coordinates
*/
function _find_angle_of_line_segment(A,B) {
    var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
    var BC = Math.sqrt(Math.pow(B.x-(B.x+1),2)+ Math.pow(B.y-B.y,2)); 
    var AC = Math.sqrt(Math.pow((B.x+1)-A.x,2)+ Math.pow(B.y-A.y,2));
    var angle = Math.acos((BC*BC+AB*AB-AC*AC)/(2*BC*AB));
    if (A.y < B.y) {
        return 2*Math.PI - angle;
    }
    return angle;
}

/* function to get order of the sites, then reorder the curVizObj.data.sites 
* array accordingly.
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} view_id -- the id for the current view
*/
function _reorderSitesData(curVizObj, view_id) {
    var sites = [];

    curVizObj.data.site_ids.forEach(function(site_id) {

        // current transformation of the site title
        var t = d3.transform(d3.select("#" + view_id).select(".siteTitle.site_"+site_id).attr("transform")),
            t_x = t.translate[0],
            t_y = t.translate[1];

        // current coordinates
        var x = (t) ? 
                    parseFloat(d3.select("#" + view_id).select(".siteTitle.site_"+site_id).attr("x")) + t_x :
                    parseFloat(d3.select("#" + view_id).select(".siteTitle.site_"+site_id).attr("x"));
        var y = (t) ? 
                    parseFloat(d3.select("#" + view_id).select(".siteTitle.site_"+site_id).attr("y")) + t_y :
                    parseFloat(d3.select("#" + view_id).select(".siteTitle.site_"+site_id).attr("y"));

        // depending on placement of title, move y-coordinate up or down
        y = (d3.select("#" + view_id).select(".siteTitle.site_"+site_id).data()[0].position == "top") ? 
            y + curVizObj.generalConfig.treeWidth/2 :
            y - curVizObj.generalConfig.treeWidth/2;

        // find the angle formed with the positive x-axis, by the line segment from the title to the view centre
        var angle = _find_angle_of_line_segment({x: x, 
                                                    y: y},
                                                {x: curVizObj.generalConfig.viewCentre.x, 
                                                    y: curVizObj.generalConfig.viewCentre.y});
        sites.push({
            "site_id": site_id,
            "angle": angle
        })
    })

    // get the site order
    sites.sort(d3.ascendingKey('angle'));
    var site_order = _.pluck(sites, "site_id");

    // rearrange curVizObj.data.sites array to reflect new ordering
    var new_sites_array = [];
    site_order.forEach(function(site_id) {
        new_sites_array.push(_.findWhere(curVizObj.data.sites, {id: site_id}));
    })

    // if we crossed the x-axis, adjust site order so the least number of sites move
    var clockwise_x_cross_angle = (2*Math.PI - curVizObj.view.startAngle) + curVizObj.view.endAngle;
    var counterclockwise_x_cross_angle = curVizObj.view.startAngle + (2*Math.PI - curVizObj.view.endAngle);
    if ((curVizObj.view.startAngle > 3*Math.PI/2) && 
        (curVizObj.view.endAngle < Math.PI) &&
        (clockwise_x_cross_angle < Math.PI)) {
        new_sites_array.push(new_sites_array.shift());
    }
    else if ((curVizObj.view.startAngle < Math.PI/2) && 
        (curVizObj.view.endAngle > Math.PI) &&
        (counterclockwise_x_cross_angle < Math.PI)) {
        new_sites_array.unshift(new_sites_array.pop());
    }
    else if ((curVizObj.view.startAngle > Math.PI) && 
        (curVizObj.view.endAngle < Math.PI/2) &&
        (clockwise_x_cross_angle < Math.PI)) {
        new_sites_array.push(new_sites_array.shift());
    }
    else if ((curVizObj.view.startAngle < Math.PI) && 
        (curVizObj.view.endAngle > 3*Math.PI/2) &&
        (counterclockwise_x_cross_angle < Math.PI)) {
        new_sites_array.unshift(new_sites_array.pop());
    }

    curVizObj.data.sites = new_sites_array;
}

/* function to visually reposition sites to their "snapped" location
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} view_id -- the id for the current view
*/ 
function _snapSites(curVizObj, view_id) {
    var dim = curVizObj.generalConfig;

    // for each site
    curVizObj.data.site_ids.forEach(function(site, site_idx) {

        // get the data
        var site_data = _.findWhere(curVizObj.data.sites, {id: site}), // data for the current site
            cur_siteG = d3.select("#" + view_id).select(".siteG.site_" + site.replace(/ /g,"_")); // svg group for this site

        // calculate angle w/the positive x-axis, formed by the line segment between the 
        // "snapped" site position & view centre
        var angle = _find_angle_of_line_segment(
                        {x: site_data.voronoi.centre.x, y: site_data.voronoi.centre.y},
                        {x: dim.viewCentre.x, y: dim.viewCentre.y});

        // move anatomic lines
        if (site_data.stem) { // if the site was found on the anatomic image
            cur_siteG.select(".anatomicPointer.site_" + site)
                .transition()
                .attr("x1", function(d) {
                    d.x1 = site_data.voronoi.centre.x;
                    return d.x1;
                })
                .attr("y1", function(d) {
                    d.y1 = site_data.voronoi.centre.y;
                    return d.y1;
                })
                .attr("x2", function(d) { 
                    return curVizObj.data.siteStems[site_data.stem.siteStem]["cropped_coords"].x;
                })
                .attr("y2", function(d) { 
                    return curVizObj.data.siteStems[site_data.stem.siteStem]["cropped_coords"].y;
                });  
        }

        // move oncoMix
        d3.select("#" + view_id).select(".oncoMixG.site_"+site)
            .transition()
            .attr("transform", function(d) {
                var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle);
                return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
            });

        // move tree (keep track of translation)
        var translation = {};
        d3.select("#" + view_id).select(".treeG.site_"+site)
            .transition()
            .attr("transform", function(d) {
                var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, angle);
                    translation = {x: (point.x-d.x), y: (point.y-d.y)};
                return "translate(" + translation.x + "," + translation.y + ")";
            });

        // move site title (keep track of translation)
        // change site title location (depending on placement of site, above or below view centre)
        var translation = {};
        d3.select("#" + view_id).select(".siteTitle.site_"+site)
            .transition()
            .attr("transform", function(d) {
                var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + 
                                    Math.pow(d.y - dim.viewCentre.y, 2)),
                    point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
                    translation = {x: (point.x-d.x), y: (point.y-d.y)};
                return "translate(" + translation.x + "," + translation.y + ")";
            })
            .attr("y", function(d) {
                if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                    d.position = "top";
                    return site_data.tree.top_middle.y - translation.y;
                }
                d.position = "bottom";
                return site_data.tree.bottom_middle.y - translation.y;
            })
            .attr("dy", function(d) {
                if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                    d.position = "top";
                    return "+0.71em";
                }
                d.position = "bottom";
                return "0em";
            })

    });
}

/* function to plot all the elements for this site (oncoMix, tree, title, anatomic lines, anatomic marks)
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} site -- current anatomic site
* @param {String} view_id -- the id for the current view
* @param {Object} drag -- drag object
*/
function _plotSite(curVizObj, site, view_id, drag) {
    var dim = curVizObj.generalConfig,
        site_data = _.findWhere(curVizObj.data.sites, {id: site}), // data for the current site
        cur_siteG = d3.select("#" + view_id).select(".siteG.site_" + site.replace(/ /g,"_")), // svg group for this site
        cols = curVizObj.view.colour_assignment;

    // TOOLTIP FUNCTIONS

    // tip for tree node cellular prevalences
    var nodeTip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            var cp;
            if (curVizObj.data["site_genotypes"][d.site].indexOf(d.id) != -1) {
                cp = (Math.round(curVizObj.data.cp_data[d.site][d.id].cp * 100)/100).toFixed(2);
            }
            else {
                cp = "";                    
            }
            return "<span style='color:white; font-family: sans-serif; font-weight:normal'>" + 
                "Prevalence: " + cp + "</span>";
        });
    d3.select("#" + view_id).select(".viewSVG").call(nodeTip);

    // tip for site titles, if they're too long to display
    var siteTitleTip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            return "<span style='color:white; font-family: sans-serif; font-weight:normal'>" +
                "Site: " + d.site + "</span>";
        });
    d3.select("#" + view_id).select(".viewSVG").call(siteTitleTip);

    // PLOT ANATOMIC LINES

    // if the site was found on the anatomic image
    if (site_data.stem) {
        cur_siteG
            .append("line")
            .classed("anatomicPointer", true)
            .classed("site_" + site, true)
            .attr("x1", function(d) {
                d.x1 = site_data.voronoi.centre.x;
                return d.x1;
            })
            .attr("y1", function(d) {
                d.y1 = site_data.voronoi.centre.y;
                return d.y1;
            })
            .attr("x2", function(d) { 
                return curVizObj.data.siteStems[site_data.stem.siteStem]["cropped_coords"].x;
            })
            .attr("y2", function(d) { 
                return curVizObj.data.siteStems[site_data.stem.siteStem]["cropped_coords"].y;
            })
            .attr("stroke", dim.anatomicLineColour)
            .attr("stroke-width", "2px");  
    }

    // PLOT ANATOMIC MARKS - marks on image 

    // if the site was found on the anatomic image
    if (site_data.stem) {
        d3.select("#" + view_id)
            .select(".anatomicMarksG")
            .append("g")
            .attr("class", function() { return "gtypeMarksG site_" + site; })
            .selectAll(".gtypeMark")
            .data(curVizObj.data.site_genotypes[site])
            .enter()
            .append("circle")
            .attr("class", function(d) { 
                return "gtypeMark clone_" + d; 
            })
            .attr("cx", function(d) { 
                return curVizObj.data.siteStems[site_data.stem.siteStem]["cropped_coords"].x;
            })
            .attr("cy", function(d) { 
                return curVizObj.data.siteStems[site_data.stem.siteStem]["cropped_coords"].y;
            })
            .attr("r", dim.siteMark_r)
            .attr("fill", function(d) { 
                return cols[d];
            })
            .attr("fill-opacity", 0)
            .attr("pointer-events", "none");
    }

    // PLOT ONCOMIX

    // create oncoMix group
    var curSiteOncoMixG = cur_siteG
        .selectAll(".oncoMixG")
        .data([{"x": site_data.voronoi.centre.x, "y": site_data.voronoi.centre.y}])
        .enter()
        .append("g")
        .classed("oncoMixG", true)
        .classed("site_" + site, true);

    // voronoi function for this site
    var voronoi = d3.geom.voronoi()
        .clipExtent([[site_data.voronoi.top_l_corner.x, 
                    site_data.voronoi.top_l_corner.y], 
                    [site_data.voronoi.top_l_corner.x + dim.oncoMixWidth, 
                    site_data.voronoi.top_l_corner.y + dim.oncoMixWidth]]);
        
    // plot cells
    var vertices = site_data.voronoi.vertices;
    var cells = curSiteOncoMixG.append("g")
        .classed("cellsG", true)
        .classed("site_" + site, true)
        .selectAll("path")
        .data(voronoi(site_data.voronoi.vertex_coords), _polygon)
        .enter().append("path")
        .classed("voronoiCell", true)
        .classed("site_" + site, true)
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
    var root = $.extend({}, curVizObj.data.treeStructure), // copy tree into new variable
        nodes = treeLayout.nodes(root), 
        links = treeLayout.links(nodes); 

    // swap x and y direction
    nodes.forEach(function(node) {
        node.tmp = node.y;
        node.y = node.x + dim.node_r + site_data.tree.top_l_corner.y;
        node.x = node.tmp + dim.node_r + site_data.tree.top_l_corner.x;
        delete node.tmp;
    });

    // tree group
    var treeG = cur_siteG
        .selectAll(".treeG")
        .data([{"x": site_data.tree.centre.x, "y": site_data.tree.centre.y}])
        .enter()
        .append("g")
        .classed("treeG", true)
        .classed("site_" + site, true);

    // create links
    var linkG = treeG
        .append("g")
        .attr("class","treeLinkG")

    linkG.selectAll(".treeLink")                  
        .data(links)                   
        .enter().append("path")                   
        .classed("treeLink", true)
        .classed("site_" + site, true)
        .attr('stroke', '#9E9A9A')
        .attr('fill', 'none') 
        .attr('stroke-width', '2px')               
        .attr("d", function(d) {
            if (curVizObj.data.direct_descendants[d.source.id][0] == d.target.id) {
                return _elbow(d);
            }
            return _shortElbow(d);
        });     

    // filter links to show only branches that connect genotypes expressed at this site
    var filtered_links = [];

    // add the most recent common ancestor for this set of genotypes
    var gtypes_to_plot = $.extend([], curVizObj.data.site_genotypes[site]); // genotypes expressed at this anatomic site
    gtypes_to_plot.push(_getMRCA(curVizObj, gtypes_to_plot));
    gtypes_to_plot = _.uniq(gtypes_to_plot);

    links.forEach(function(link) {

        var source = link.source.id,
            target = link.target.id,
            source_and_ancestors = $.extend([], curVizObj.data.treeAncestorsArr[source]),
            target_and_descendants = $.extend([], curVizObj.data.treeDescendantsArr[target]);
        source_and_ancestors.push(source);
        target_and_descendants.push(target);

        // if the source (or ancestors) and target (or descendants) are expressed at this anatomic site
        if ((_getIntersection(source_and_ancestors, gtypes_to_plot).length > 0) && 
            (_getIntersection(target_and_descendants, gtypes_to_plot).length > 0)) {
            // add this link
            filtered_links.push(link);
        }   
    })

    // create hidden links for mixture classification hover
    linkG.selectAll(".mixtureClassTreeLink")                  
        .data(filtered_links)                   
        .enter().append("path")                   
        .classed("mixtureClassTreeLink", true)
        .classed("site_" + site, true)
        .attr('stroke', '#9E9A9A')
        .attr('fill', 'none') 
        .attr('stroke-width', '2px')               
        .attr("d", function(d) { return _elbow(d); })
        .attr("stroke-opacity",0); 
        
    // create nodes
    var nodeG = treeG
        .append("g")
        .attr("class", "treeNodeG")
        .selectAll(".treeNode")                  
        .data(nodes)                   
        .enter()
        .append("g");

    nodeG.append("circle")     
        .attr("cx", ƒ('x'))
        .attr("cy", ƒ('y'))              
        .classed("treeNode", true) 
        .classed("site_" + site, true)
        .attr("fill", function(d) {
            // clone present at this site or not
            return (curVizObj.data["site_genotypes"][site].indexOf(d.id) != -1) ? 
                cols[d.id] : "#FFFFFF";
        })
        .attr("stroke", function(d) {
            // clone present at this site or not
            return (curVizObj.data["site_genotypes"][site].indexOf(d.id) != -1) ? 
                cols[d.id] : "#FFFFFF";
        })
        .attr("r", function(d) {
            // clone present at this site or not
            return (curVizObj.data["site_genotypes"][site].indexOf(d.id) != -1) ? dim.node_r : 0;
        })
        .on('mouseover', function(d) {
            d.site = site;
            if (!dim.selectOn && !dim.dragOn) {
                // show tooltip
                nodeTip.show(d);
            }
        })
        .on('mouseout', function(d) {
            if (!dim.selectOn) {
                // hide tooltip
                nodeTip.hide(d);
            }
        });

    // PLOT SITE TITLES

    cur_siteG
        .selectAll(".siteTitle")
        .data([{"x": site_data.tree.centre.x, "y": site_data.tree.centre.y}])
        .enter()
        .append("text")
        .classed("siteTitle", true)
        .classed("site_" + site, true)
        .attr("x", site_data.tree.top_middle.x)
        .attr("y", function(d) {
            // set site name in data object
            d.site = site_data.id;

            if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                d.position = "top";
                return site_data.tree.top_middle.y;
            }
            d.position = "bottom";
            return site_data.tree.bottom_middle.y;
        })
        .attr("dy", function(d) {
            if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                return "+0.71em";
            }
            return "0em";
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", dim.viewDiameter/40)
        .attr("fill", '#9E9A9A')
        .style("cursor", "pointer")
        .text(function(d) { 
            // if title is too long, append "..." to the first few letters
            if (d.site.length > 6) {
                return d.site.slice(0,6) + "...";
            }
            return d.site; 
        })
        .on("mouseover", function(d) { 
            if (!dim.selectOn) {
                // if title is too long, make mouseover to see full name
                if (d.site.length > 6) {
                    return siteTitleTip.show(d);
                }
            }
        })
        .on("mouseout", function(d) {
            if (!dim.selectOn) {
                // if title is too long, make mouseout to hide full name
                if (d.site.length > 6) {
                    return siteTitleTip.hide(d);
                }
            }
        })
        .call(drag);

}

/* initial ordering of sites based on their anatomic locations 
* (angle with positive x-axis, formed by the line segment between the site position on the image & view centre)
*/
function _initialSiteOrdering(curVizObj) {
    var sites = [], // sites and their y-coordinates
        dim = curVizObj.generalConfig;

    // for each site
    curVizObj.data.sites.forEach(function(site) {
        // anatomic location detected
        if (site.stem) {

            // cropped x, y positions 
            var centre = _scale(curVizObj).centre_prop;

            // calculate angle w/the positive x-axis, formed by the line segment between the 
            // site position & view centre
            var angle = _find_angle_of_line_segment(
                            {x: site.stem.x, y: site.stem.y},
                            {x: centre.x, y: centre.y});

            sites.push({
                "site_id": site.id,
                "stem": site.stem.siteStem,
                "angle": angle
            });
        }
        // if no anatomic location detected
        else {
            sites.push({
                "site_id": site.id,
                "stem": "NA", // no site stem (ie. location) found
                "angle": Math.PI/2 // auto position is on the bottom of the view (pi/2 from positive x-axis)
            });
        }
    });

    // sort sites by y-direction and stem
    _sortByKey(sites, "angle", "stem");

    // rearrange curVizObj.data.sites array to reflect new ordering
    var new_sites_array = [];
    sites.forEach(function(site) {
        new_sites_array.push(_.findWhere(curVizObj.data.sites, {id: site.site_id}));
    })
    curVizObj.data.sites = new_sites_array;
}

// GENERAL FUNCTIONS

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * From: http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
 */
function _getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

/* function to get the intersection of two arrays
* @param {Array} array1 -- first array
* @param {Array} array2 -- second array
*/
function _getIntersection(array1, array2) {

    if (array1 == undefined || array2 == undefined) {
        return [];
    }

    return array1.filter(function(n) {
        return array2.indexOf(n) != -1
    });
}

/* function to sort array of objects by key
* modified from: http://stackoverflow.com/questions/8837454/sort-array-of-objects-by-single-key-with-date-value
*/
function _sortByKey(array, key, secondKey) {
    secondKey = secondKey || "NA";
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        var res = ((x < y) ? -1 : ((x > y) ? 1 : 0));
        if (secondKey == "NA") {
            return res;            
        }
        else {
            if (typeof(a[secondKey] == "string")) {
                return (res == 0) ? (a[secondKey] > b[secondKey]) : res;
            }
            else if (typeof(a[secondKey] == "number")) {
                return (res == 0) ? (a[secondKey] - b[secondKey]) : res;
            }
            else {
                return res;
            }
        }
    });
}

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * from: http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
 */
function _getRandom(min, max) {
    return Math.random() * (max - min) + min;
}

/* function to get the intersection of many arrays.
* modified from: http://stackoverflow.com/questions/11076067/finding-matches-between-multiple-javascript-arrays
* @param {Array} array - array of arrays from which to find common elements across all arrays.
*/
function _getIntersectionManyArrays(arrays) {
    var arrays_copy = $.extend([], arrays);
    var result = arrays_copy.shift().filter(function(v) {
        return arrays.every(function(a) {
            return a.indexOf(v) !== -1;
        });
    });

    return result;
}
