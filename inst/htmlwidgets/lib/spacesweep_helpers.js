// D3 EFFECTS FUNCTIONS


/* recursive function to perform downstream effects upon tree link highlighting
* @param {Object} vizObj
* @param link_id -- id for the link that's currently highlighted
* @param link_ids -- ids for all links in tree
*/
function _downstreamEffects(vizObj, link_id, link_ids) {

    // get target id & single cell id
    var targetRX = new RegExp("legendTreeLink_.+_(.+)");  
    var target_id = targetRX.exec(link_id)[1];

    // highlight the current link
    d3.select("." + link_id).attr("stroke-opacity", 1);

    // highlight sites associated with the target genotype
    _legendGtypeHighlight(vizObj, target_id);

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
        _downstreamEffects(vizObj, target_link_id, link_ids);
    });
};

/* function for mouseover highlighting of legend genotype
* @param {Object} vizObj
* @param {String} cur_gtype -- genotype on hover
*/
function _legendGtypeHighlight(vizObj, cur_gtype) {
    // highlight genotype on legend tree
    d3.selectAll("." + cur_gtype).attr("fill-opacity", 1).attr("stroke-opacity", 1);

    // highlight those sites showing the moused-over genotype
    _highlightSites(vizObj.data.genotype_sites[cur_gtype]);
}

/* function to shade all elements of the view
*/
function _shadeView() {
    d3.selectAll(".voronoiCell").attr("fill-opacity", 0.15).attr("stroke-opacity", 0.15);
    d3.selectAll(".treeNode").attr("fill-opacity", 0.15).attr("stroke-opacity", 0.15);
    d3.selectAll(".treeLink").attr("stroke-opacity", 0.15);
    d3.selectAll(".siteTitle").attr("fill-opacity", 0.15);
    d3.selectAll(".anatomicPointer").attr("stroke-opacity", 0.25)
}

/* function for view reset
* @param {Object} vizObj
*/
function _resetView(vizObj) {
    // reset anatomic marks
    d3.selectAll(".anatomicGtypeMark").attr("fill-opacity", 0);
    d3.selectAll(".anatomicGeneralMark").attr("fill-opacity", 0);

    // reset legend tree nodes
    d3.selectAll(".legendTreeNode").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.selectAll(".legendTreeLink").attr("fill-opacity", 1).attr("stroke-opacity", 1);

    // reset all elements of view
    d3.selectAll(".voronoiCell").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.selectAll(".treeNode").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.selectAll(".treeLink").attr("stroke-opacity", 1);
    d3.selectAll(".siteTitle").attr("fill-opacity", 1);
    d3.selectAll(".anatomicPointer").attr("stroke-opacity", 1)
}

/* function to highlight certain sites in the view
* @param {Array} site_ids -- site ids to highlight
*/
function _highlightSites(site_ids) {
    site_ids.forEach(function(site) {
        d3.selectAll(".voronoiCell." + site).attr("fill-opacity", 1).attr("stroke-opacity", 1);
        d3.selectAll(".treeNode." + site).attr("fill-opacity", 1).attr("stroke-opacity", 1);
        d3.selectAll(".treeLink." + site).attr("stroke-opacity", 1);
        d3.selectAll(".siteTitle." + site).attr("fill-opacity", 1);
        d3.selectAll(".anatomicPointer." + site).attr("stroke-opacity", 1)
    })
}

/* function during drag event
* @param {Object} vizObj
* @param {String} cur_site -- current site being dragged
* @param {Object} d -- data object for current site svg group
*/
function _dragFunction(vizObj, cur_site, d) {
    var dim = vizObj.generalConfig;

    // calculate angle w/the positive x-axis, formed by the line segment between the mouse & view centre
    var angle = _find_angle_of_line_segment(
                    {x: d3.event.x, y: d3.event.y},
                    {x: dim.viewCentre.x, y: dim.viewCentre.y});

    // move anatomic pointer
    d3.select(".anatomicPointer."+cur_site)
        .attr("x1", function() {
            var r = Math.sqrt(Math.pow(d.x1 - dim.viewCentre.x, 2) + 
                                Math.pow(d.y1 - dim.viewCentre.y, 2)),
                point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
            return point.x;
        })
        .attr("y1", function() {
            var r = Math.sqrt(Math.pow(d.x1 - dim.viewCentre.x, 2) + 
                                Math.pow(d.y1 - dim.viewCentre.y, 2)),
                point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
            return point.y;
        })

    // move oncoMix
    d3.select(".oncoMixG."+cur_site)
        .attr("transform", function(d) {
            var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + 
                                Math.pow(d.y - dim.viewCentre.y, 2)),
                point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
            return "translate(" + (point.x-d.x) + "," + 
                                    (point.y-d.y) + ")";
        });

    // move tree * site title
    d3.select(".treeAndSiteTitleG."+cur_site)
        .attr("transform", function(d) {
            var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + 
                                Math.pow(d.y - dim.viewCentre.y, 2)),
                point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
            return "translate(" + (point.x-d.x) + "," + 
                                    (point.y-d.y) + ")";
        });    
}

// ANATOMY IMAGE FUNCTIONS

/* function to get proportional anatomic locations on the anatomic diagram
* @param {Object} vizObj
*/
function _getSiteLocationsOnImage(vizObj) {
    // female anatomy
    if (vizObj.userConfig.gender == "F") {
        vizObj.view.siteLocationsOnImage = [
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
        vizObj.view.siteLocationsOnImage = [
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
* @param {Object} vizObj 
*/
function _assignAnatomicLocations(vizObj) {

    // keep track of stems in this dataset, and their corresponding site ids
    vizObj.data.siteStemsInDataset = {};

    vizObj.data.sites = [];

    // for each site in the data
    vizObj.site_ids.forEach(function(site_id) {
        var site_data = {id: site_id};

        // for each potential stem
        for (var i = 0; i < vizObj.view.siteLocationsOnImage.length; i++) {
            var cur_location = vizObj.view.siteLocationsOnImage[i];

            // if this stem is applicable to the current site id
            var siteStem = cur_location.siteStem;
            if (site_id.toLowerCase().startsWith(siteStem.toLowerCase())) {

                // add the stem data to the site id data
                site_data.stem = cur_location;

                // add this site id to the stems data
                if (vizObj.data.siteStemsInDataset[siteStem]) {
                    vizObj.data.siteStemsInDataset[siteStem].site_ids.push(site_id);
                }
                else {
                    vizObj.data.siteStemsInDataset[siteStem] = cur_location;
                    vizObj.data.siteStemsInDataset[siteStem].site_ids = [site_id];
                }

                break;
            }

            // no site found - throw warning
            if (i == vizObj.view.siteLocationsOnImage.length-1) {
                console.warn("No corresponding anatomic site found for site \"" + site_id + "\".")
            }
        }

        // add this site to list of sites
        vizObj.data.sites.push(site_data);
    })
}

/* function to get image bounds for the anatomic data in this dataset
* @param {Object} vizObj
*/
function _getImageBounds(vizObj) {
    var min_x = Infinity,
        max_x = -1
        min_y = Infinity,
        max_y = -1;

    Object.keys(vizObj.data.siteStemsInDataset).forEach(function(siteStem) {
        var cur_siteStem = vizObj.data.siteStemsInDataset[siteStem];
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

    vizObj.view.imageBounds = {
        min_x: min_x,
        min_y: min_y,
        max_x: max_x,
        max_y: max_y
    }
}

/* function to scale an image 
* @param {Number} crop_width -- the width of the crop region 
* @param {Number} original_width -- the width of the original image
* @param {Array}
*/
function _scale(vizObj) {

    var anatomy_padding = 0.05; // 5% of the image
    var original_width = vizObj.generalConfig.image_plot_width;

    // get the width (width == height) of the cropped section
    var bounds = vizObj.view.imageBounds;
    var crop_width_prop = ((bounds.max_x - bounds.min_x) > (bounds.max_y - bounds.min_y)) ? 
        (bounds.max_x - bounds.min_x + anatomy_padding*2) :
        (bounds.max_y - bounds.min_y + anatomy_padding*2);
    var crop_width = crop_width_prop*vizObj.generalConfig.image_plot_width; 

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

    return crop_info;
}

/* function to transform a coordinate to its cropped equivalent on the anatomy image
* @param {Object} crop_info -- cropping onformation (shifts, width, etc.)
* @param {Number} x_prop -- x-coordinate [0,1] on original image
* @param {Number} y_prop -- y-coordinate [0,1] on original image
* @param {Number} top_l_x -- absolute x-coordinate for the top left of the plotting area
* @param {Number} top_l_y -- absolute y-coordinate for the top left of the plotting area
* @param {Number} plot_width -- absolute width for the plotting area
* @return absolute coordinates
*/
function _getCroppedCoordinate(crop_info, x_prop, y_prop, top_l_x, top_l_y, plot_width) {
    var cropped_x_prop = (x_prop - crop_info.left_shift_prop)/crop_info.crop_width_prop;
    var cropped_y_prop = (y_prop - crop_info.up_shift_prop)/crop_info.crop_width_prop;

    var cropped_coordinates = {
        x: top_l_x + (cropped_x_prop*plot_width), 
        y: top_l_y + (cropped_y_prop*plot_width)
    };
    return cropped_coordinates;
}

// TREE FUNCTIONS

/* extract all info from tree about nodes, edges, ancestors, descendants
* @param {Object} vizObj 
*/
function _getTreeInfo(vizObj) {
    var userConfig = vizObj.userConfig,
        rootName = 'Root',
        cur_edges = userConfig.tree_edges;

    // get tree nodes
    vizObj.data.treeNodes = _.uniq(_.pluck(cur_edges, "source").concat(_.pluck(cur_edges, "target")));

    // get tree edges
    vizObj.data.treeEdges = [];
    for (var i = 0; i < cur_edges.length; i++) {
        vizObj.data.treeEdges.push({
            "source": cur_edges[i].source,
            "target": cur_edges[i].target
        })
    }

    // get tree structure
    var nodesByName = [];
    for (var i = 0; i < vizObj.data.treeEdges.length; i++) {
        var parent = _findNodeByName(nodesByName, vizObj.data.treeEdges[i].source);
        var child = _findNodeByName(nodesByName, vizObj.data.treeEdges[i].target);
        parent["children"].push(child);
    }

    // if we want to show the root
    var root_tree = _findNodeByName(nodesByName, rootName);
    if (userConfig.show_root) {
       vizObj.data.treeStructure = root_tree;
    }

    // we do not want to show the root
    else {
        if (root_tree.children.length > 1) {
            console.error("The root ('Root') in the tree has more than one child - " 
                + "either the tree must be changed, or the root must be included (R parameter show_root == TRUE).")
        }
        rootName = root_tree.children[0].id;
        var new_root_tree = _findNodeByName(nodesByName, rootName);
        vizObj.data.treeStructure = new_root_tree;
    }    

    // get descendants for each node
    vizObj.data.treeDescendantsArr = {};
    vizObj.data.treeNodes.forEach(function(node, idx) {
        var curRoot = _findNodeByName(nodesByName, node);
        var curDescendants = _getDescendantIds(curRoot, []);
        vizObj.data.treeDescendantsArr[node] = curDescendants;
    })
    vizObj.data.direct_descendants = _getDirectDescendants(vizObj.data.treeStructure, {});

    // get ancestors for each node
    vizObj.data.treeAncestorsArr = _getAncestorIds(vizObj);
    vizObj.data.direct_ancestors = _getDirectAncestors(vizObj.data.treeStructure, {});

    // get the height of the tree
    vizObj.data.tree_height = 0;
    Object.keys(vizObj.data.treeAncestorsArr).forEach(function(key) {
        var ancestor_arr = vizObj.data.treeAncestorsArr[key];
        if (ancestor_arr.length > vizObj.data.tree_height) {
            vizObj.data.tree_height = ancestor_arr.length;
        }
    })
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
* @param {Object} vizObj
*/
function _getAncestorIds(vizObj) {
    var ancestors = {},
        curDescendants,
        descendants_arr = vizObj.data.treeDescendantsArr,
        treeNodes = vizObj.data.treeNodes;

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

// COLOUR FUNCTIONS

function _getColours(vizObj) {
    var dim = vizObj.generalConfig,
        colour_assignment = {}, // standard colour assignment
        patient_id = vizObj.patient_id,
        cur_colours = vizObj.userConfig.clone_cols;

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
    colour_assignment['Root'] = dim.rootColour;
    vizObj.view.colour_assignment = colour_assignment;
}

/* function to get a colour palette
*/
function _getColourPalette() {

    var colours = {
        "Reds": 
            ["#F8766D","#f8837b", "#f9918a", "#fa9f99", "#fbada7", "#fcbbb6", "#fcc8c5", "#fdd6d3", 
            "#fee4e2", "#fff2f1"].reverse(),
        "Greens":
            ["#53B400", "#64bb19", "#75c333", "#86ca4c", "#98d266", "#a9da80", "#bae199", "#cce9b3", 
            "#ddf0cc", "#eef8e6"].reverse(),
        "Pinks":
            ["#FB61D7", "#f870db", "#f980df", "#fa90e3", "#fba0e7", "#fcb0eb", "#fcc0ef", "#fdd0f3", 
            "#fee0f7", "#fff0fb"].reverse(),
        "Turquoises":
            ["#00C094", "#19c69e", "#33cca9", "#4cd3b4", "#66d9bf", "#80e0ca", "#99e6d4", "#b3ecdf", 
            "#ccf3ea", "#e6f9f5"].reverse(),
        "Purples":
            ["#A58AFF", "#ae95ff", "#b7a1ff", "#c0adff", "#c9b9ff", "#d2c5ff", "#dbd0ff", "#e4dcff", 
            "#ede8ff", "#f6f4ff"].reverse(),
        "Blues":
            ["#00B6EB", "#19bded", "#33c4ef", "#4cccf1", "#66d3f3", "#80dbf5", "#99e2f7", "#b3e9f9", 
            "#ccf1fb", "#e6f8fd"].reverse(),
        "Yellows":
            ["#C49A00","#caa419", "#d0ae33", "#d6b84c", "#dcc266", "#e2cd80", "#e8d799", "#eee1b3", 
            "#f4ebcc", "#faf5e6"].reverse(),
        "Greys":
            ["#CBCBCB"]
    }

    return colours;
}

/*
* function to, using the tree hierarchy, get appropriate colours for each genotype
* @param {Object} vizObj
* @param {Object} chains -- the linear segments (chains) in the genotype tree 
*                           (key is segment start key, value is array of descendants in this chain)
* @param {Object} curNode -- current key in the tree
* @param {Array} palette -- colour themes to choose from
* @param {Object} colour_assignment -- originally empty array of the final colour assignments
* @param {String} curTheme -- the colour theme currently in use
*/
function _colourTree(vizObj, chains, curNode, palette, colour_assignment, curTheme) {

    // colour node
    if (curNode.id == "Root") {
        colour_assignment[curNode.id] = vizObj.generalConfig.rootColour; // grey
        var n = chains[curNode.id].length+1; // + 1 to include the base key (this child)
        var tmp_palette = [];
        for (var j = 8; j >= 0; j -= Math.floor(9/n)) {
            tmp_palette.push(palette[curTheme][j])
        }
        palette[curTheme] = tmp_palette;
    }
    else {
        colour_assignment[curNode.id] = palette[curTheme].shift();
    }

    // if the current key has zero or >1 child to search through
    if (curNode.children.length != 1 && curNode.id != "Root") { 

        // remove its colour theme from the colour themes available
        delete palette[curTheme];
    }

    // if the current key has one child only
    if (curNode.children.length == 1) {

        // colour child with the same theme as its parent
        _colourTree(vizObj, chains, curNode.children[0], palette, colour_assignment, curTheme)
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
            _colourTree(vizObj, chains, tmpChildren[i], palette, colour_assignment, curTheme)
        }
    }

    return colour_assignment;
}

function _getColours(vizObj) {
    var colour_palette = _getColourPalette();
    var chains = _getLinearTreeSegments(vizObj.data.treeStructure, {}, "");
    colour_assignment = _colourTree(vizObj, chains, vizObj.data.treeStructure, 
        colour_palette, {}, "Greys");
    vizObj.view.colour_assignment = colour_assignment;
}

// function to increase brightness of hex colour
// from: http://stackoverflow.com/questions/6443990/javascript-calculate-brighter-colour
function _increase_brightness(hex, percent){
    // strip the leading # if it's there
    hex = hex.replace(/^\s*#|\s*$/g, '');

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if(hex.length == 3){
        hex = hex.replace(/(.)/g, '$1$1');
    }

    var r = parseInt(hex.substr(0, 2), 16),
        g = parseInt(hex.substr(2, 2), 16),
        b = parseInt(hex.substr(4, 2), 16);

    return '#' +
       ((0|(1<<8) + r + (256 - r) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + g + (256 - g) * percent / 100).toString(16)).substr(1) +
       ((0|(1<<8) + b + (256 - b) * percent / 100).toString(16)).substr(1);
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
function _getCPData(vizObj) {
    var clonal_prev = vizObj.userConfig.clonal_prev;

    // for each time point, for each genotype, get cellular prevalence
    var cp_data = {};
    $.each(clonal_prev, function(idx, hit) { // for each hit (genotype/site_id combination)

        cp_data[hit["site_id"]] = cp_data[hit["site_id"]] || {};
        cp_data[hit["site_id"]][hit["clone_id"]] = {};
        cp_data[hit["site_id"]][hit["clone_id"]]["cp"] = parseFloat(hit["clonal_prev"]); 
    });

    vizObj.data.cp_data = cp_data;
}

/* function to threshold and adjust cellular prevalences 
* (genotypes with small cellular prevalences will not be plotted;
* the rest will be adjusted such that the sum of adjusted CPs is 1)
* @param {Object} vizObj 
*/
function _thresholdCPData(vizObj) {

    vizObj.site_ids.forEach(function(site) {

        // threshold the cellular prevalence 
        // (> prevalence of one cell in this view)

        var threshold = 0.01;
        var total_legit_cp = 0; // the total sum of cellular prevalence after filtering out those below threshold
        Object.keys(vizObj.data.cp_data[site]).forEach(function(gtype) {

            var cur_cp = vizObj.data.cp_data[site][gtype].cp;

            // only add genotypes that will be exhibited in >1 cell
            if (cur_cp > threshold) {
                total_legit_cp += vizObj.data.cp_data[site][gtype].cp;
            }
            // warn if this genotype will not be shown
            else {
                console.warn("At anatomic site " + site + ", genotype " + gtype + " has cellular prevalence " +
                    "less than the minimum for this view, and will not be shown.");
            }
        });

        // adjust cellular prevalence values of to sum to 1

        vizObj.data["genotypes_to_plot"] = vizObj.data["genotypes_to_plot"] || {};
        vizObj.data["genotypes_to_plot"][site] = []; // which genotypes to show for this site
        Object.keys(vizObj.data.cp_data[site]).forEach(function(gtype) {

            var cur_cp = vizObj.data.cp_data[site][gtype].cp;

            // only add genotypes that will be exhibited in >1 cell
            if (cur_cp > threshold) {
                vizObj.data.cp_data[site][gtype].adj_cp = cur_cp/total_legit_cp;
                vizObj.data["genotypes_to_plot"][site].push(gtype);
            }
        });
    });
}

/* function to get the sites expressing each genotype
* @param {Object} genotypes_to_plot -- each site (1st level property) has an array of genotypes at that site
*/
function _getGenotypeSites(genotypes_to_plot) {
    var genotype_sites = {};

    vizObj.data.treeNodes.forEach(function(gtype) {
        var sites_containing_gtype = [];
        Object.keys(vizObj.data.genotypes_to_plot).forEach(function(site) {
            if (vizObj.data.genotypes_to_plot[site].indexOf(gtype) != -1) {
                sites_containing_gtype.push(site);
            }
        });
        genotype_sites[gtype] = sites_containing_gtype;
    })

    vizObj.data.genotype_sites = genotype_sites;
}

// VORONOI FUNCTIONS

function _polygon(d) {
  return "M" + d.join("L") + "Z";
}

/* function to get voronoi vertices for this anatomic site (randomly fill a rectangle, keeping all within a certain 
* radius from the centre as "real cells", all others as "fake cells") 
* @param {Object} vizObj 
* @param {Number} cx -- x-coordinate at centre of oncoMix
* @param {Number} cy -- y-coordinate at centre of oncoMix
*/
function _getVoronoiVertices(vizObj, cx, cy) {
    var dim = vizObj.generalConfig;

    // voronoi vertices 
    var circleRadius = dim.oncoMixWidth*1/3;
    var n_real_cells = 1;
    var vertices = [];
    while (n_real_cells <= dim.nCells) {
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
* @param {Object} vizObj 
* @param {String} site -- current anatomic site of interest
* @param {Array} vertices -- array of voronoi vertices objects (properties: x, y, real_cell) for this site 
*/
function _addGtypeInfoToVertices(vizObj, site, vertices) {

    var gtypes = vizObj.data["genotypes_to_plot"][site], // genotypes to plot for this site
        cumulative_cp = vizObj.data.cp_data[site][gtypes[0]].adj_cp, // cumulative CP thus far
        gtype_i = 0, // index of the current genotype to show
        cur_gtype, // current genotype
        n_real_cells = 1; // # real cells seen

    // for each vertex    
    vertices.forEach(function(v, i) {

        cur_gtype = gtypes[gtype_i];

        // if this is a real cell
        if (v.real_cell) {

            // if the current genotype has been allocated enough cells, advance one genotype
            if (n_real_cells/vizObj.generalConfig.nCells > Math.round(cumulative_cp * 100)/100) {
                cur_gtype = gtypes[++gtype_i]; // update current genotype
                cumulative_cp += vizObj.data.cp_data[site][cur_gtype].adj_cp; // update cumulative CP
            }

            // note colour for this vertex, based on appropriate genotype
            v.col = vizObj.view.colour_assignment[cur_gtype];

            // we've seen another real cell
            n_real_cells++;
        }
    })

    return vertices;
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
* @param {Object} vizObj
*/
function _getSitePositioning(vizObj) {
    var dim = vizObj.generalConfig,
        n_sites = vizObj.site_ids.length; // number of sites

    // for each site
    vizObj.data.sites.forEach(function(cur_site_obj, site_idx) {
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
                vizObj, 
                cur_site_obj["voronoi"]["centre"].x,
                cur_site_obj["voronoi"]["centre"].y
            );

        // add colour (genotype) information to each vertex
        cur_site_obj["voronoi"]["vertices"] = _addGtypeInfoToVertices(vizObj, 
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
        var site_gtypes = vizObj.data["genotypes_to_plot"][site_id];
        // pure tumour
        if (site_gtypes.length == 1) {
            phyly = "pure";
        }
        // monophyletic tumour
        else {
            for (var i = 0; i < site_gtypes.length; i++) {
                var gtypeAndAncestors = vizObj.data.treeAncestorsArr[site_gtypes[i]].slice();
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

/* function to get order of the sites, from negative x-, negative y- axis, then reorder the vizObj.data.sites 
* array accordingly.
* @param {Object} vizObj
*/
function _reorderSitesData(vizObj) {
    var sites = [];

    vizObj.site_ids.forEach(function(site_id) {

        // current transformation of the site title / tree group
        var t = d3.transform(d3.select(".treeAndSiteTitleG."+site_id).attr("transform")),
            t_x = t.translate[0],
            t_y = t.translate[1];

        // current coordinates
        var x = (t) ? 
                    parseFloat(d3.select(".siteTitle."+site_id).attr("x")) + t_x :
                    parseFloat(d3.select(".siteTitle."+site_id).attr("x"));
        var y = (t) ? 
                    parseFloat(d3.select(".siteTitle."+site_id).attr("y")) + t_y :
                    parseFloat(d3.select(".siteTitle."+site_id).attr("y"));

        // depending on placement of title, move y-coordinate up or down
        y = (d3.select(".siteTitle."+site_id).data()[0].position == "top") ? 
            y + vizObj.generalConfig.treeWidth/2 :
            y - vizObj.generalConfig.treeWidth/2;

        // find the angle formed with the positive x-axis, by the line segment from the title to the view centre
        var angle = _find_angle_of_line_segment({x: x, 
                                                    y: y},
                                                {x: vizObj.generalConfig.viewCentre.x, 
                                                    y: vizObj.generalConfig.viewCentre.y});
        sites.push({
            "site_id": site_id,
            "angle": angle
        })
    })

    // get the site order
    _sortByKey(sites, "angle");
    var site_order = _.pluck(sites, "site_id");

    // rearrange vizObj.data.sites array to reflect new ordering
    var new_sites_array = [];
    site_order.forEach(function(site_id) {
        new_sites_array.push(_.findWhere(vizObj.data.sites, {id: site_id}));
    })
    vizObj.data.sites = new_sites_array;
}

/* function to visually reposition sites to their "snapped" location
* @param {Object} vizObj
* @param {d3 Object} viewSVG -- svg for the central view
*/ 
function _snapSites(vizObj, viewSVG) {
    var dim = vizObj.generalConfig;

    // for each site
    vizObj.site_ids.forEach(function(site, site_idx) {

        // get the data
        var site_data = _.findWhere(vizObj.data.sites, {id: site}), // data for the current site
            cur_siteG = viewSVG.select(".siteG." + site.replace(/ /g,"_")); // svg group for this site

        // calculate angle w/the positive x-axis, formed by the line segment between the 
        // "snapped" site position & view centre
        var angle = _find_angle_of_line_segment(
                        {x: site_data.voronoi.centre.x, y: site_data.voronoi.centre.y},
                        {x: dim.viewCentre.x, y: dim.viewCentre.y});

        // move anatomic lines
        if (site_data.stem) { // if the site was found on the anatomic image
            cur_siteG.select(".anatomicPointer." + site)
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
                    var cropped_x = _getCroppedCoordinate(vizObj.crop_info, 
                                                                site_data.stem.x, 
                                                                site_data.stem.y,
                                                                dim.image_top_l.x,
                                                                dim.image_top_l.y,
                                                                dim.image_plot_width
                                                            ).x;
                    return cropped_x;
                })
                .attr("y2", function(d) { 
                    var cropped_y = _getCroppedCoordinate(vizObj.crop_info, 
                                                                site_data.stem.x, 
                                                                site_data.stem.y,
                                                                dim.image_top_l.x,
                                                                dim.image_top_l.y,
                                                                dim.image_plot_width
                                                            ).y;
                    return cropped_y;
                });  
        }

        // move oncoMix
        d3.select(".oncoMixG."+site)
            .transition()
            .attr("transform", function(d) {
                var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + 
                                    Math.pow(d.y - dim.viewCentre.y, 2)),
                    point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
                return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
            });

        // move tree * site title
        // keep track of translation
        var translation = {};
        d3.select(".treeAndSiteTitleG."+site)
            .transition()
            .attr("transform", function(d) {
                var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + 
                                    Math.pow(d.y - dim.viewCentre.y, 2)),
                    point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
                    translation = {x: (point.x-d.x), y: (point.y-d.y)};
                return "translate(" + translation.x + "," + translation.y + ")";
            });

        // change site title location (depending on placement of site, above or below view centre)
        d3.select(".siteTitle." + site)
            .transition()
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
* @param {Object} vizObj
* @param {String} site -- current anatomic site
* @param {Object} viewSVG -- main view svg
*/
function _plotSite(vizObj, site, viewSVG) {
    var dim = vizObj.generalConfig,
        site_data = _.findWhere(vizObj.data.sites, {id: site}), // data for the current site
        cur_siteG = viewSVG.select(".siteG." + site.replace(/ /g,"_")), // svg group for this site
        cols = vizObj.view.colour_assignment;

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

    // PLOT ANATOMIC LINES

    // if the site was found on the anatomic image
    if (site_data.stem) {
        cur_siteG
            .append("line")
            .classed("anatomicPointer", true)
            .classed(site, true)
            .attr("x1", function(d) {
                d.x1 = site_data.voronoi.centre.x;
                return d.x1;
            })
            .attr("y1", function(d) {
                d.y1 = site_data.voronoi.centre.y;
                return d.y1;
            })
            .attr("x2", function(d) { 
                var cropped_x = _getCroppedCoordinate(vizObj.crop_info, 
                                                            site_data.stem.x, 
                                                            site_data.stem.y,
                                                            dim.image_top_l.x,
                                                            dim.image_top_l.y,
                                                            dim.image_plot_width
                                                        ).x;
                return cropped_x;
            })
            .attr("y2", function(d) { 
                var cropped_y = _getCroppedCoordinate(vizObj.crop_info, 
                                                            site_data.stem.x, 
                                                            site_data.stem.y,
                                                            dim.image_top_l.x,
                                                            dim.image_top_l.y,
                                                            dim.image_plot_width
                                                        ).y;
                return cropped_y;
            })
            .attr("stroke", "#CBCBCB")
            .attr("stroke-width", "2px");  
    }

    // PLOT ANATOMIC MARKS - marks on image 

    // if the site was found on the anatomic image
    if (site_data.stem) {
        cur_siteG
            .append("g")
            .attr("class", "anatomicGtypeMarksG")
            .selectAll(".anatomicGtypeMark")
            .data(vizObj.data.genotypes_to_plot[site])
            .enter()
            .append("circle")
            .attr("class", function(d) { 
                return "anatomicGtypeMark " + d; 
            })
            .attr("cx", function(d) { 
                var cropped_x = _getCroppedCoordinate(vizObj.crop_info, 
                                                            site_data.stem.x, 
                                                            site_data.stem.y,
                                                            dim.image_top_l.x,
                                                            dim.image_top_l.y,
                                                            dim.image_plot_width
                                                        ).x;
                return cropped_x + vizObj.view.jitter[d].x;
            })
            .attr("cy", function(d) { 
                var cropped_y = _getCroppedCoordinate(vizObj.crop_info, 
                                                            site_data.stem.x, 
                                                            site_data.stem.y,
                                                            dim.image_top_l.x,
                                                            dim.image_top_l.y,
                                                            dim.image_plot_width
                                                        ).y;
                return cropped_y + vizObj.view.jitter[d].y;
            })
            .attr("r", dim.siteMark_r)
            .attr("fill", function(d) { 
                return cols[d];
            })
            .attr("fill-opacity", 0);
    }

    // PLOT ONCOMIX

    // create oncoMix group
    var curSiteOncoMixG = cur_siteG
        .selectAll(".oncoMixG")
        .data([{"x": site_data.voronoi.centre.x, "y": site_data.voronoi.centre.y}])
        .enter()
        .append("g")
        .classed("oncoMixG", true)
        .classed(site, true);

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
        .classed(site, true)
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

    // create tree & title group
    var curSiteTreeAndSiteTitleG = cur_siteG
        .selectAll(".treeAndSiteTitleG")
        .data([{"x": site_data.tree.centre.x, "y": site_data.tree.centre.y}])
        .enter()
        .append("g")
        .classed("treeAndSiteTitleG", true)
        .classed(site, true);

    // create links
    var link = curSiteTreeAndSiteTitleG.append("g")
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
    var nodeG = curSiteTreeAndSiteTitleG.append("g")
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
            if (!dim.dragOn) {
                // show tooltip
                nodeTip.show(d);
            }
        })
        .on('mouseout', function(d) {
            // hide tooltip
            nodeTip.hide(d);
        });

    // PLOT SITE TITLES

    curSiteTreeAndSiteTitleG.append("text")
        .classed("siteTitle", true)
        .classed(site, true)
        .attr("x", site_data.tree.top_middle.x)
        .attr("y", function(d) {
            if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                d.position = "top";
                return site_data.tree.top_middle.y;
            }
            d.position = "bottom";
            return site_data.tree.bottom_middle.y;
        })
        .attr("dy", function(d) {
            if (site_data.angle > Math.PI && site_data.angle < 2*Math.PI) {
                d.position = "top";
                return "+0.71em";
            }
            d.position = "bottom";
            return "0em";
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "sans-serif")
        .attr("font-size", dim.viewDiameter/40)
        .attr("fill", '#9E9A9A')
        .text(site_data.id);

}

/* initial ordering of sites based on their anatomic locations 
* (angle with positive x-axis, formed by the line segment between the site position on the image & view centre)
*/
function _initialSiteOrdering(vizObj) {
    var sites = [], // sites and their y-coordinates
        dim = vizObj.generalConfig;

    // for each site
    vizObj.data.sites.forEach(function(site) {
        // anatomic location detected
        if (site.stem) {

            // cropped x, y positions 
            var centre = _scale(vizObj).centre_prop;

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

    // rearrange vizObj.data.sites array to reflect new ordering
    var new_sites_array = [];
    sites.forEach(function(site) {
        new_sites_array.push(_.findWhere(vizObj.data.sites, {id: site.site_id}));
    })
    vizObj.data.sites = new_sites_array;
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