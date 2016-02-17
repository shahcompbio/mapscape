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
* @param {String} site -- current anatomic site of interest
*/
function _thresholdCPData(vizObj, site) {

    // threshold the cellular prevalence 
    // (> prevalence of one cell in this view)

    var total_legit_cp = 0; // the total sum of cellular prevalence after filtering out those below threshold
    Object.keys(vizObj.data.cp_data[site]).forEach(function(gtype) {

        var cur_cp = vizObj.data.cp_data[site][gtype].cp;

        // only add genotypes that will be exhibited in >1 cell
        if (cur_cp > 1/vizObj.generalConfig.nCells) {
            total_legit_cp += cur_cp;
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
        if (cur_cp > 1/vizObj.generalConfig.nCells) {
            vizObj.data.cp_data[site][gtype].adj_cp = cur_cp/total_legit_cp;
            vizObj.data["genotypes_to_plot"][site].push(gtype);
        }
    });
}


// VORONOI FUNCTIONS

function _polygon(d) {
  return "M" + d.join("L") + "Z";
}

/* function to get voronoi vertices for this anatomic site (randomly fill a rectangle, keeping all within a certain 
* radius from the centre as "real cells", all others as "fake cells") 
* @param {Object} vizObj 
* @param {String} site -- current anatomic site of interest
*/
function _getVoronoiVertices(vizObj, site) {
    var dim = vizObj.generalConfig;

    // voronoi vertices 
    var circleRadius = dim.gridCellHeight/2 - 45;
    var cx = dim.gridCellWidth/2;
    var cy = dim.gridCellHeight/2;
    var n_real_cells = 1;
    var vertices = [];
    while (n_real_cells <= dim.nCells) {
        var x = Math.random() * dim.gridCellWidth;
        var y = Math.random() * dim.gridCellHeight;
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

    vizObj.data["voronoi_vertices"] = vizObj.data["voronoi_vertices"] || {};
    vizObj.data["voronoi_vertices"][site] = vertices;
}

/* function to add colour (genotype) information to each vertex for this anatomic site
* @param {Object} vizObj 
* @param {String} site -- current anatomic site of interest
*/
function _addGtypeInfoToVertices(vizObj, site) {

    var gtypes = vizObj.data["genotypes_to_plot"][site], // genotypes to plot for this site
        cumulative_cp = vizObj.data.cp_data[site][gtypes[0]].adj_cp, // cumulative CP thus far
        gtype_i = 0, // index of the current genotype to show
        cur_gtype, // current genotype
        n_real_cells = 1; // # real cells seen

    // for each vertex    
    vizObj.data["voronoi_vertices"][site].forEach(function(v, i) {

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
}

// GENERAL FUNCTIONS

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 * From: http://stackoverflow.com/questions/1527803/generating-random-numbers-in-javascript-in-a-specific-range
 */
function _getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}