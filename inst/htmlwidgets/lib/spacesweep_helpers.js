// D3 EFFECTS FUNCTIONS

/* function to perform d3 effects when legend clone is highlighted
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} clone_id -- id for the selected clone
* @param {Boolean} showPrevalence -- whether or not to show prevalence information
*/
function _legendCloneHighlight(curVizObj, clone_id, showPrevalence) {
    var view_id = curVizObj.view_id;

    // highlight node in the legend
    d3.select("#" + view_id)
        .select(".legendTreeNode.clone_" + clone_id.split(' ').join('_'))
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // highlight node at each sample
    curVizObj.data.genotype_samples[clone_id].forEach(function(sample) {
        d3.select("#" + view_id)
            .select(".treeNode.clone_" + clone_id.split(' ').join('_') + ".sample_" + sample.split(' ').join('_'))
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
    })

    // highlight oncoMix cells at each sample
    curVizObj.data.genotype_samples[clone_id].forEach(function(sample) {
        d3.select("#" + view_id)
            .selectAll(".voronoiCell.clone_" + clone_id.split(' ').join('_') + ".sample_" + sample.split(' ').join('_'))
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
    })

    // highlight sample title & link to anatomy
    curVizObj.data.genotype_samples[clone_id].forEach(function(sample) {
        d3.select("#" + view_id).selectAll(".sampleTitle.sample_" + sample.split(' ').join('_')).attr("fill-opacity", 1);
        d3.select("#" + view_id).selectAll(".anatomicPointer.sample_" + sample.split(' ').join('_')).attr("stroke-opacity", 1);
    });

    if (showPrevalence) {
        // plot clonal prevalence text for this clone at each sample
        curVizObj.data.genotype_samples[clone_id].forEach(function(sample) {
            _plotClonalPrevText(curVizObj, sample, clone_id);
        });
    }
}

/* function to check for any selections / drags
* @param {Object} curVizObj -- vizObj for the current view
*/
function _checkForSelections(curVizObj) {
    var dim = curVizObj.generalConfig;

    if (!dim.selectOn && !dim.dragOn && !dim.mutSelectOn) {
        return true;
    }
    return false;
}

/* background click function (turns off selections, resets view)
* @param {Object} curVizObj -- vizObj for the current view
*/
function _backgroundClick(curVizObj) {
    var dim = curVizObj.generalConfig;

    // if there was just a link selection, refresh the mutations table
    if (dim.selectOn) {
        // delete existing data table
        d3.select("#" + curVizObj.view_id + "_mutationTable" + "_wrapper").remove();

        // make new full table
        _makeMutationTable(curVizObj, curVizObj.view.mutationTableDIV, curVizObj.data.mutations,
            dim.mutationTableHeight);
    }

    dim.selectOn = false;
    dim.dragOn = false;
    dim.mutSelectOn = false;
    dim.nClickedNodes = 0;
    dim.curCloneIDs = [];

    // mark all mutations as unselected
    d3.select("#" + curVizObj.view_id + "_mutationTable").selectAll("tr").classed('selected', false);

    // remove all mutation prevalences information from view
    d3.select("#" + curVizObj.view_id).selectAll(".mutationPrev").remove();

    _resetView(curVizObj);
}

/* recursive function to perform downstream or upstream effects on legend tree link
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} link_id -- id for the link that's currently highlighted
* @param {Array} link_ids -- ids for all links in tree
* @param {String} stream_direction -- "downstream" or "upstream"
*/
function _propagatedEffects(curVizObj, link_id, link_ids, stream_direction) {
    var view_id = curVizObj.view_id;

    // clear propagation info in vizObj
    curVizObj.view.propagation = {};

    // get propagation info
    _getPropatagedItems(curVizObj, link_id, link_ids, stream_direction);

    // unique samples and locations
    curVizObj.view.propagation.samples = _.uniq(curVizObj.view.propagation.samples);
    curVizObj.view.propagation.locations = _.uniq(curVizObj.view.propagation.locations);

    // highlight links 
    curVizObj.view.propagation.link_ids.forEach(function(link) {
        // in the legend
        d3.select("#" + view_id)
            .select(".legendTreeLink." + link)
            .attr("stroke-opacity", 1);

        // at each sample
        curVizObj.view.propagation.samples.forEach(function(sample) {
            d3.select("#" + view_id)
                .select(".treeLink." + link + ".sample_" + sample.split(' ').join('_'))
                .attr("stroke-opacity", 1);
        })
    });

    // highlight nodes 
    curVizObj.view.propagation.node_ids.forEach(function(node) {
        // in the legend
        d3.select("#" + view_id)
            .select(".legendTreeNode.clone_" + node.split(' ').join('_'))
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);

        // at each sample
        curVizObj.view.propagation.samples.forEach(function(sample) {
            d3.select("#" + view_id)
                .select(".treeNode.clone_" + node.split(' ').join('_') + ".sample_" + sample.split(' ').join('_'))
                .attr("fill-opacity", 1)
                .attr("stroke-opacity", 1);
        })
    });

    // highlight oncoMix cells at each sample
    curVizObj.view.propagation.node_ids.forEach(function(node) {
        curVizObj.view.propagation.samples.forEach(function(sample) {
            d3.select("#" + view_id)
                .selectAll(".voronoiCell.clone_" + node.split(' ').join('_') + ".sample_" + sample.split(' ').join('_'))
                .attr("fill-opacity", 1)
                .attr("stroke-opacity", 1);
        })
    });

    // highlight general anatomic marks for each sample
    curVizObj.view.propagation.locations.forEach(function(location) {
        d3.select("#" + view_id)
            .select(".generalMark.location_" + location)
            .attr("fill", curVizObj.generalConfig.anatomicLineColour);        
    });

    // highlight sample title & link to anatomy
    curVizObj.view.propagation.samples.forEach(function(sample) {
        d3.select("#" + view_id).selectAll(".sampleTitle.sample_" + sample.split(' ').join('_')).attr("fill-opacity", 1);
        d3.select("#" + view_id).selectAll(".anatomicPointer.sample_" + sample.split(' ').join('_')).attr("stroke-opacity", 1);
    });
};

/* function to get the links, nodes, samples and sample locations participating in the current propagation
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} link_id -- id for the link that's currently highlighted
* @param {Array} link_ids -- ids for all links in tree
* @param {String} stream_direction -- "downstream" or "upstream"
*/
function _getPropatagedItems(curVizObj, link_id, link_ids, stream_direction) {
    var view_id = curVizObj.view_id,
        generalTargetRX = new RegExp("treeLink_.+_(.+)"), // regex to get target
        generalSourceRX = new RegExp("treeLink_(.+)_.+"); // regex to get source

    // get target & source id of this link
    var target_id = generalTargetRX.exec(link_id)[1];
    var source_id = generalSourceRX.exec(link_id)[1];

    // get samples showing the target clone
    var samples = curVizObj.data.genotype_samples[target_id];

    // highlight the general anatomic marks for those samples showing the moused-over genotype
    var locations = [];
    samples.forEach(function(sample) {
        var cur_sample = _.findWhere(curVizObj.data.samples, {sample_id: sample});
        // if this sample has an anatomic mark
        if (cur_sample.location) {
            locations.push(cur_sample.location.location_id);
        }
    })

    // get the targets of this target, or sources of source
    var nextNodeRX = (stream_direction == "downstream") ? 
        new RegExp("treeLink_" + target_id + "_(.+)") :
        new RegExp("treeLink_(.+)_" + source_id);
    var targetLinks_of_targetNode = [];
    link_ids.map(function(id) {
        if (id.match(nextNodeRX)) {
            targetLinks_of_targetNode.push(id);
        }
    });

    // add information to curVizObj
    curVizObj.view.propagation = curVizObj.view.propagation || {};
    curVizObj.view.propagation.samples = curVizObj.view.propagation.samples || [];
    curVizObj.view.propagation.samples = curVizObj.view.propagation.samples.concat(samples);
    curVizObj.view.propagation.locations = curVizObj.view.propagation.locations || [];
    curVizObj.view.propagation.locations = curVizObj.view.propagation.locations.concat(locations);
    curVizObj.view.propagation.node_ids = curVizObj.view.propagation.node_ids || [];
    curVizObj.view.propagation.node_ids.push(target_id);
    curVizObj.view.propagation.link_ids = curVizObj.view.propagation.link_ids || [];
    curVizObj.view.propagation.link_ids.push(link_id);

    // for each of the target's targets, highlight their downstream links
    targetLinks_of_targetNode.map(function(target_link_id) {
        _getPropatagedItems(curVizObj, target_link_id, link_ids, stream_direction);
    });
};

/* function to plot clonal prevalence text at a particular sample for a particular clone
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} sample -- sample of interest
* @param {String} gtype -- genotype of interest
*/
function _plotClonalPrevText(curVizObj, sample, gtype) {
    var dim = curVizObj.generalConfig;

    // plot clonal prevalence text
    d3.select("#" + curVizObj.view_id).select(".spacesweep_" + curVizObj.view_id).append("text")
        .attr("class", "clonalPrev")
        .attr("x", function() {

            // anatomic line object
            var line = d3.select("#" + curVizObj.view_id).select(".anatomicPointer.sample_"+sample.split(' ').join('_'));

            // coordinates of point a certain distance after anatomic line
            var coords = _fromLineGetPoint(line, dim.oncoMixWidth/2 - 2, "1");

            // anatomic pointer coordinates
            return coords.x;
        })
        .attr("y", function() {

            // anatomic line object
            var line = d3.select("#" + curVizObj.view_id).select(".anatomicPointer.sample_"+sample.split(' ').join('_'));

            // coordinates of point a certain distance after anatomic line
            var coords = _fromLineGetPoint(line, dim.oncoMixWidth/2 - 2, "1");

            // anatomic pointer coordinates
            return coords.y;
        })
        .attr("text-anchor", "middle")
        .attr("dy", "+0.35em")
        .attr("font-family", "Arial")
        .attr("font-size", 10) 
        .text(function() { 
            return (Math.round(curVizObj.data.cp_data[sample][gtype].cp * 100)/100).toFixed(2);
        });
}

/* function for highlighting genotype on anatomic image
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} cur_gtype -- genotype on hover
*/
function _legendGtypeHighlight(curVizObj, cur_gtype) {
    var view_id = curVizObj.view_id;

    // highlight genotype on legend tree
    d3.select("#" + view_id).selectAll(".legendTreeNode.clone_" + cur_gtype.split(' ').join('_'))
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // highlight genotype on anatomic image
    d3.select("#" + view_id).selectAll(".gtypeMark.clone_" + cur_gtype.split(' ').join('_'))
        .attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);
}

/* function to shade all elements of the main view
* @param {Object} curVizObj -- vizObj for the current view
*/
function _shadeMainView(curVizObj) {
    var view_id = curVizObj.view_id,
        dim = curVizObj.generalConfig;

    d3.select("#" + view_id).selectAll(".voronoiCell")
        .attr("fill-opacity", dim.shadeAlpha)
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".treeNode")
        .attr("fill-opacity", dim.shadeAlpha)
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".treeLink")
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".sampleTitle")
        .attr("fill-opacity", dim.shadeAlpha);
    d3.select("#" + view_id).selectAll(".anatomicPointer")
        .attr("stroke-opacity", 0.25);
}

/* function to shade all elements of the legend
* @param {Object} curVizObj -- vizObj for the current view
*/
function _shadeLegend(curVizObj) {
    var view_id = curVizObj.view_id,
        dim = curVizObj.generalConfig;

    d3.select("#" + view_id)
        .selectAll(".legendTreeNode")
        .attr("fill-opacity", dim.shadeAlpha)
        .attr("stroke-opacity", dim.shadeAlpha);
    d3.select("#" + view_id)
        .selectAll(".legendTreeLink")
        .attr("stroke-opacity", dim.shadeAlpha);
}

/* function for view reset
* @param {Object} curVizObj -- vizObj for the current view
*/
function _resetView(curVizObj) {
    var view_id = curVizObj.view_id,
        dim = curVizObj.generalConfig;

    // reset anatomic marks
    d3.select("#" + view_id).selectAll(".gtypeMark").attr("fill-opacity", 0);
    d3.select("#" + view_id).selectAll(".generalMark").attr("fill", "#CBCBCB").attr("fill-opacity", 1)
        .attr("stroke-opacity", 1);

    // reset legend tree nodes & links
    d3.select("#" + view_id).selectAll(".legendTreeNode").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".legendTreeLink").attr("fill-opacity", 1).attr("stroke-opacity", 1)
        .attr("stroke", dim.neutralGrey);

    // reset all elements of main view
    d3.select("#" + view_id).selectAll(".voronoiCell").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".treeNode").attr("fill-opacity", 1).attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".treeLink").attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".sampleTitle").attr("fill-opacity", 1);
    d3.select("#" + view_id).selectAll(".anatomicPointer").attr("stroke-opacity", 1);
    d3.select("#" + view_id).selectAll(".mixtureClassTreeLink").attr("stroke-opacity", 0);
}

/* function to highlight certain samples in the view
* @param {Array} sample_ids -- sample ids to highlight
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _highlightSites(sample_ids, curVizObj) {
    var view_id = curVizObj.view_id; 

    sample_ids.forEach(function(sample) {
        d3.select("#" + view_id).selectAll(".voronoiCell.sample_" + sample.split(' ').join('_'))
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
        d3.select("#" + view_id).selectAll(".treeNode.sample_" + sample.split(' ').join('_'))
            .attr("fill-opacity", 1)
            .attr("stroke-opacity", 1);
        d3.select("#" + view_id).selectAll(".treeLink.sample_" + sample.split(' ').join('_')).attr("stroke-opacity", 1);
        d3.select("#" + view_id).selectAll(".sampleTitle.sample_" + sample.split(' ').join('_')).attr("fill-opacity", 1);
        d3.select("#" + view_id).selectAll(".anatomicPointer.sample_" + sample.split(' ').join('_')).attr("stroke-opacity", 1)
    })
}

/* function during drag event
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
* @param {String} cur_sample -- current sample being dragged
* @param {Object} d -- data object for current sample svg group
*/
function _dragFunction(curVizObj, cur_sample, d) {
    var view_id = curVizObj.view_id,
        dim = curVizObj.generalConfig;

    // calculate angle w/the positive x-axis, formed by the line segment between the mouse & view centre
    var angle = _find_angle_of_line_segment(
                    {x: d3.event.x, y: d3.event.y},
                    {x: dim.viewCentre.x, y: dim.viewCentre.y});

    // move anatomic pointer
    d3.select("#" + view_id).select(".anatomicPointer.sample_"+cur_sample.split(' ').join('_'))
        .attr("x1", function(d) {
            return _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle).x;
        })
        .attr("y1", function(d) {
            return _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle).y;
        })

    // move oncoMix
    d3.select("#" + view_id).select(".oncoMixG.sample_"+cur_sample.split(' ').join('_'))
        .attr("transform", function(d) {
            var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle);
            return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
        });

    // move tree 
    d3.select("#" + view_id).select(".treeG.sample_"+cur_sample.split(' ').join('_'))
        .attr("transform", function(d) {
            var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, angle);
            return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
        }); 

    // move sample title
    d3.select("#" + view_id).select(".sampleTitle.sample_"+cur_sample.split(' ').join('_'))
        .attr("transform", function(d) {
            var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + Math.pow(d.y - dim.viewCentre.y, 2)),
                point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
            return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
        });    
}

// ANATOMY IMAGE FUNCTIONS

/* function to get dimensions (h & w) of image from its url
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
* @param {String} url -- url to image
* @return dimensions of image
*/
function _getImageDimensions(curVizObj, url){   
    var img = new Image();
    img.onload = function(){
        curVizObj.view.image_width = this.width;
        curVizObj.view.image_height = this.height;
        curVizObj.view.aspect_ratio = this.width/this.height; // aspect ratio of image
        curVizObj.imgDimDeferred.resolve("obtained image dimensions")
    };
    img.src = url;
}

/* function to map samples to anatomic locations
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _mapSamplesToAnatomy(curVizObj) {
    curVizObj.data.samples = [];

    // for each sample location, get its coordinates, and add it to the data
    curVizObj.userConfig.sample_locations.forEach(function(sample_location) {
        var cur_sample = {sample_id: sample_location.sample_id}
        cur_sample["location"] = sample_location;

        curVizObj.data.samples.push(cur_sample);
    })
}


/* function to get participating anatomic locations in this view
* @param {Object} curVizObj -- vizObj for the current view 
*/
function _getParticipatingAnatomicLocations(curVizObj) {

    // keep track of locations in this dataset, and their corresponding sample ids
    curVizObj.data.anatomic_locations = {};

    curVizObj.data.samples.forEach(function(sample) {
        var location_id = sample["location"].location_id;

        // add this sample id to the locations data
        if (curVizObj.data.anatomic_locations[location_id]) {
            curVizObj.data.anatomic_locations[location_id].sample_ids.push(sample.sample_id);
        }
        else {
            curVizObj.data.anatomic_locations[location_id] = {
                "location_id": sample["location"].location_id,
                "x": sample["location"].x,
                "y": sample["location"].y
            };
            curVizObj.data.anatomic_locations[location_id].sample_ids = [sample.sample_id];
        }
    })
}

/* function to get absolute boundaries for the anatomic data in this dataset
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getImageBounds(curVizObj) {
    var min_x = Infinity,
        max_x = -1
        min_y = Infinity,
        max_y = -1;

    // get the boundaries of the sample locations on the image
    Object.keys(curVizObj.data.anatomic_locations).forEach(function(location_id) {
        var cur_sampleLocation = curVizObj.data.anatomic_locations[location_id];
        if (min_x > cur_sampleLocation.x) {
            min_x = cur_sampleLocation.x;
        }
        if (min_y > cur_sampleLocation.y) {
            min_y = cur_sampleLocation.y;
        }
        if (max_x < cur_sampleLocation.x) {
            max_x = cur_sampleLocation.x;
        }
        if (max_y < cur_sampleLocation.y) {
            max_y = cur_sampleLocation.y;
        }
    })

    // centre of sample locations on the image
    var centre = {
        x: ((max_x + min_x)/2), 
        y: ((max_y + min_y)/2)
    };

    // find the largest radius from the centre of the sample locations to each sample locations
    var max_r = -1;
    Object.keys(curVizObj.data.anatomic_locations).forEach(function(location_id) {
        var cur_sampleLocation = curVizObj.data.anatomic_locations[location_id];
        var dist = Math.sqrt( Math.pow((cur_sampleLocation.x-centre.x), 2) + 
                                Math.pow((cur_sampleLocation.y-centre.y), 2) );
        if (dist > max_r) {
            max_r = dist;
        }
    })

    // proportionate sample location bounds [0,1], and the absolute centre these locations on the original image
    curVizObj.view.sampleBounds = {
        min_x: min_x,
        min_y: min_y,
        max_x: max_x,
        max_y: max_y,
        max_r: max_r,
        centre: centre
    }
}

/* function to scale an image 
* @param {Object} curVizObj -- vizObj for the current view
*/
function _scale(curVizObj) {

    var dim = curVizObj.generalConfig;
    var anatomy_padding = 15; // in pixels

    // get the width & height of the cropped section
    var bounds = curVizObj.view.sampleBounds;

    // diameter of the cropped region on the SAMPLE image
    var crop_diameter = (bounds.max_r + anatomy_padding) * 2;
    var crop_width_prop = crop_diameter/curVizObj.view.image_width; // (crop_diameter : original_width) ratio

    // scale image such that region of interest is as big as the image plot diameter
    var scaling_factor = dim.image_plot_diameter/crop_diameter;
    var scaled_image_width = scaling_factor * curVizObj.view.image_width;
    var scaled_image_height = scaling_factor * curVizObj.view.image_height;

    // PROPORTIONAL centre of sample locations
    var centre_prop = {
        x: ((bounds.max_x + bounds.min_x)/2)/curVizObj.view.image_width, 
        y: ((bounds.max_y + bounds.min_y)/2)/curVizObj.view.image_height
    };

    // absolute centre of sample locations on the SCALED image
    var scaled_centre = {
        x: ((bounds.max_x + bounds.min_x)/2) * scaling_factor, 
        y: ((bounds.max_y + bounds.min_y)/2) * scaling_factor
    };

    // to centre the image, we need to move it left and up by how much
    var left_shift = (scaled_centre.x - dim.image_plot_diameter/2);
    var up_shift = (scaled_centre.y - dim.image_plot_diameter/2);

    var crop_info = {
        crop_width_prop: crop_width_prop,
        scaled_image_width: scaled_image_width,
        scaled_image_height: scaled_image_height,
        scaling_factor: scaling_factor,
        crop_diameter: crop_diameter,
        left_shift: left_shift,
        up_shift: up_shift,
        centre_prop, centre_prop
    }

    // get cropped absolute x, y coordinates for each sample location
    Object.keys(curVizObj.data.anatomic_locations).forEach(function(location) {
        curVizObj.data.anatomic_locations[location]["cropped_coords"] = 
            _getCroppedCoordinate(crop_info, curVizObj.data.anatomic_locations[location], dim.image_top_l);
    })

    return crop_info;
}

/* function to transform a coordinate to its cropped equivalent on the anatomy image
* @param {Object} crop_info -- cropping onformation (shifts, width, etc.)
* @param {Object} original_coords -- object with x- and y-coordinates (in pixels) on original image (properties "x", "y")
* @param {Object} top_l -- absolute x- and y-coordinates for the top left of the plotting area (properties "x", "y")
* @return absolute coordinates
*/
function _getCroppedCoordinate(crop_info, original_coords, top_l) {
    var cropped_x = (original_coords.x * crop_info.scaling_factor) - crop_info.left_shift;
    var cropped_y = (original_coords.y * crop_info.scaling_factor) - crop_info.up_shift;

    return { x: top_l.x + cropped_x, y: top_l.y + cropped_y };
}

// TREE FUNCTIONS

/* extract all info from tree about nodes, edges, ancestors, descendants
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _getTreeInfo(curVizObj) {
    var userConfig = curVizObj.userConfig,
        cur_edges = userConfig.tree_edges,
        phantomRoot = curVizObj.generalConfig.phantomRoot; // root so we have a lead-in link to the real root

    // get tree nodes
    curVizObj.data.treeNodes = _.uniq(_.pluck(cur_edges, "source").concat(_.pluck(cur_edges, "target")));
    curVizObj.data.treeNodes.push(phantomRoot);

    // get tree edges
    curVizObj.data.treeEdges = [];
    for (var i = 0; i < cur_edges.length; i++) {
        curVizObj.data.treeEdges.push({
            "source": cur_edges[i].source,
            "target": cur_edges[i].target
        })
    }

    // find tree root
    var cur_source = curVizObj.data.treeEdges[0].source;
    var source_as_target = // edge where the current source is the target
        _.findWhere(curVizObj.data.treeEdges, {"target": cur_source}); 
    while (source_as_target) { // iterate as long as there are edges with the current source as the target
        cur_source = source_as_target.source;
        source_as_target = _.findWhere(curVizObj.data.treeEdges, {"target": cur_source});
    }
    var rootName = cur_source;

    // add the phantomRoot to the tree edges array
    curVizObj.data.treeEdges.push({
        "source": phantomRoot,
        "target": rootName
    })

    // get tree structure
    var nodesByName = [];
    for (var i = 0; i < curVizObj.data.treeEdges.length; i++) {
        var parent = _findNodeByName(nodesByName, curVizObj.data.treeEdges[i].source);
        var child = _findNodeByName(nodesByName, curVizObj.data.treeEdges[i].target);
        parent["children"].push(child);
    }
    var root_tree = _findNodeByName(nodesByName, phantomRoot); 
    curVizObj.data.treeStructure = root_tree; 

    // get in-order traversal node order of tree
    curVizObj.data.nodesColourOrder = _phyloTraversal(curVizObj.data.treeStructure, [], 0);

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

/* function to get samples affected by each link (link identified here by its target clone id)
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getSitesAffectedByLink(curVizObj) {
    var affected_samples = {};

    // for each clone
    curVizObj.data.treeNodes.forEach(function(clone) {
        var cur_affected_samples = [];

        // the clone and its descendants
        var gtypeAndDescendants = curVizObj.data.treeDescendantsArr[clone];
        gtypeAndDescendants.push(clone);

        // for each of its descendants (and itself)
        gtypeAndDescendants.forEach(function(desc) {

            // append the samples affected by that descendant
            cur_affected_samples = cur_affected_samples.concat(curVizObj.data.genotype_samples[desc]);
        });

        affected_samples[clone] = _.uniq(cur_affected_samples);
    })

    curVizObj.data.link_affected_samples = affected_samples;
}

/* traversal of tree for phylogenetic colouring
* @param {Object} curNode -- current node object
* @param {Array} nodes_ordered -- originally empty array of ordered nodes
* @param {Number} cur_height -- originally 0, the height of the current node
*/
function _phyloTraversal(curNode, nodes_ordered, cur_height) {

    // no children -- add to ordered nodes
    var n_children = curNode.children.length;
    if (n_children == 0) {
        nodes_ordered.push({"id": curNode.id,
                            "height": cur_height});
    }

    // children -- add to ordered nodes, then search children
    else {
        nodes_ordered.push({"id": curNode.id,
                            "height": cur_height});
        // search children
        for (var i = 0; i < n_children; i++) {
            _phyloTraversal(curNode.children[i], nodes_ordered, cur_height+1);
        }
    }
    return nodes_ordered;
}

// COLOUR FUNCTIONS

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function _hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}


// convert RGB to hex
// http://stackoverflow.com/questions/1740700/get-hex-value-rather-than-rgb-value-using-jquery
function _rgb2hex(rgb) {
     if (  rgb.search("rgb") == -1 ) {
          return rgb;
     } else {
          rgb = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+))?\)$/);
          function hex(x) {
               return ("0" + parseInt(x).toString(16)).slice(-2);
          }
          return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]); 
     }
}

/* function to calculate colours based on phylogeny 
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getPhyloColours(curVizObj) {

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
    }

    // clone colours not specified
    else {
        var s = 0.95, // saturation
            l = 0.7; // lightness

        // number of nodes
        var n_nodes = curVizObj.data.nodesColourOrder.length;

        for (var i = 0; i < n_nodes; i++) {
            var h = i/n_nodes;
            var rgb = _hslToRgb(h, s, l); // hsl to rgb
            var col = _rgb2hex("rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")"); // rgb to hex

            colour_assignment[curVizObj.data.nodesColourOrder[i].id] = col;
        }
    }
    curVizObj.view.colour_assignment = colour_assignment;  
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
* (properties at level 1 is sample, at level 2 is gtype)
*/
function _getCPData(curVizObj) {
    var clonal_prev = curVizObj.userConfig.clonal_prev;

    // for each time point, for each genotype, get cellular prevalence
    var cp_data = {};
    $.each(clonal_prev, function(idx, hit) { // for each hit (genotype/sample_id combination)

        cp_data[hit["sample_id"]] = cp_data[hit["sample_id"]] || {};
        cp_data[hit["sample_id"]][hit["clone_id"]] = {};
        cp_data[hit["sample_id"]][hit["clone_id"]]["cp"] = parseFloat(hit["clonal_prev"]); 
    });

    curVizObj.data.cp_data = cp_data;
}

/* function to threshold and adjust cellular prevalences 
* (genotypes with small cellular prevalences will not be plotted;
* the rest will be adjusted such that the sum of adjusted CPs is 1)
* @param {Object} curVizObj -- vizObj for the current view 
*/
function _thresholdCPData(curVizObj) {

    curVizObj.data.sample_ids.forEach(function(sample) {

        // threshold the cellular prevalence 

        var threshold = 0.01;
        var total_legit_cp = 0; // the total sum of cellular prevalence after filtering out those below threshold
        Object.keys(curVizObj.data.cp_data[sample]).forEach(function(gtype) {

            var cur_cp = curVizObj.data.cp_data[sample][gtype].cp;

            // only add genotypes that will be exhibited in >1 cell
            if (cur_cp > threshold) {
                total_legit_cp += curVizObj.data.cp_data[sample][gtype].cp;
            }
            // warn if this genotype will not be shown
            else {
                console.warn("At anatomic sample " + sample + ", genotype " + gtype + " has cellular prevalence " +
                    "less than the minimum for this view, and will not be shown.");
            }
        });

        // adjust cellular prevalence values to sum to 1

        curVizObj.data["sample_genotypes"] = curVizObj.data["sample_genotypes"] || {};
        curVizObj.data["sample_genotypes"][sample] = []; // which genotypes to show for this sample
        Object.keys(curVizObj.data.cp_data[sample]).forEach(function(gtype) {

            var cur_cp = curVizObj.data.cp_data[sample][gtype].cp;

            // only add genotypes that will be exhibited in >1 cell
            if (cur_cp > threshold) {
                curVizObj.data.cp_data[sample][gtype].adj_cp = cur_cp/total_legit_cp;
                curVizObj.data["sample_genotypes"][sample].push(gtype);
            }
        });
    });
}

/* function to get, for each genotype, the samples expressing that genotype
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _getGenotypeSites(curVizObj) {
    // each sample (1st level property) has an array of genotypes at that sample
    var sample_genotypes = curVizObj.data.sample_genotypes,
        genotype_samples = {};

    curVizObj.data.treeNodes.forEach(function(gtype) {
        var samples_containing_gtype = [];
        Object.keys(curVizObj.data.sample_genotypes).forEach(function(sample) {
            if (curVizObj.data.sample_genotypes[sample].indexOf(gtype) != -1) {
                samples_containing_gtype.push(sample);
            }
        });
        genotype_samples[gtype] = samples_containing_gtype;
    })

    curVizObj.data.genotype_samples = genotype_samples;
}

/* function to get, for each genotype, the locations expressing that genotype
* @param {Object} curVizObj -- vizObj for the current view -- curVizObj for this view
*/
function _getGenotypeLocations(curVizObj) {
    // each sample (1st level property) has an array of genotypes at that sample
    var genotype_locations = {};

    curVizObj.data.treeNodes.forEach(function(gtype) {

        // get samples showing the target clone
        var samples = curVizObj.data.genotype_samples[gtype];

        // get location id for each sample
        var locations = [];
        samples.forEach(function(sample) {
            var cur_sample = _.findWhere(curVizObj.data.samples, {sample_id: sample});
            // if this sample has an anatomic mark
            if (cur_sample.location) {
                locations.push(cur_sample.location.location_id);
            }
        })

        genotype_locations[gtype] = _.uniq(locations);
    });

    curVizObj.data.genotype_locations = genotype_locations;
}

// VORONOI FUNCTIONS

function _polygon(d) {
  return "M" + d.join("L") + "Z";
}

/* function to get voronoi vertices for this anatomic sample (randomly fill a rectangle, keeping all within a certain 
* radius from the centre as "real cells", all others as "fake cells") 
* @param {Object} curVizObj -- vizObj for the current view 
* @param {Number} cx -- x-coordinate at centre of oncoMix
* @param {Number} cy -- y-coordinate at centre of oncoMix
* @param {Number} seed -- seed for random generator TODO !!!!!!!!!!!!!!!!!!!! works when seed is set to 20, but not when it's the sample index
*/
function _getVoronoiVertices(curVizObj, cx, cy, seed) {
    var dim = curVizObj.generalConfig;

    // set seed in curVizObj
    curVizObj.seed = seed;

    // voronoi vertices 
    var circleRadius = dim.oncoMixWidth*1/3;
    var n_real_cells = 1;
    var vertices = [];
    while (n_real_cells <= curVizObj.userConfig.n_cells) {
        var x = (cx - dim.oncoMixWidth/2) + (_random(curVizObj) * dim.oncoMixWidth); 
        var y = (cy - dim.oncoMixWidth/2) + (_random(curVizObj) * dim.oncoMixWidth);
        var dist = Math.sqrt(Math.pow(x-cx, 2) + Math.pow(y-cy, 2));
        var inside_circle = (dist < circleRadius);
        if (inside_circle) {
            n_real_cells++;
        }
        vertices.push({x: x, y: y, real_cell: inside_circle});
    }

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

/* function to order oncoMix vertices such that genotypes are clustered, 
* & add colour (genotype) information to each vertex for this anatomic sample
* @param {Object} curVizObj -- vizObj for the current view
* @param {Array} vertices -- array of voronoi vertices objects (properties: x, y, real_cell) for this sample 
* @param {String} sample -- current anatomic sample of interest
* @param {Object} oncoMix_centre -- centre of oncoMix
*/
function _colourOncoMix(curVizObj, vertices, sample, oncoMix_centre) {

    var gtypes = curVizObj.data["sample_genotypes"][sample], // genotypes to plot for this sample
        cumulative_cp = curVizObj.data.cp_data[sample][gtypes[0]].adj_cp, // cumulative CP thus far
        gtype_i = 0, // index of the current genotype to show
        n_real_cells = 1; // # real cells seen

    // separate out real cells and fake cells
    var real_vertices = $.extend([], _.filter(vertices, function(v) { return v.real_cell; }));
    var fake_vertices = $.extend([], _.filter(vertices, function(v) { return !v.real_cell; }));

    // get genotypes and corresponding number of cells
    var gtypes_and_ncells = {};
    var n_cells = 0;
    gtypes.forEach(function(gtype) {
        gtypes_and_ncells[gtype] = 
            Math.round(curVizObj.data.cp_data[sample][gtype].adj_cp * curVizObj.userConfig.n_cells);
        n_cells += (curVizObj.data.cp_data[sample][gtype].adj_cp * curVizObj.userConfig.n_cells);
    })

    // order genotypes from smallest cellular prevalence to largest cellular prevalence
    // so smallest groups are placed first, and guaranteed a spot, despite rounding function
    gtypes.sort(function(a, b) {return gtypes_and_ncells[a] - gtypes_and_ncells[b]; });

    // copy real vertices (vertices will be removed as they're used)
    var unassigned_real_vertices = $.extend([], real_vertices); 
    var assigned_real_vertices = []; // to fill with vertices that have a cluster assignment

    // order real vertices by distance to centre of oncoMix (farthest to closest)
    unassigned_real_vertices.forEach(function(vertex) {
        vertex["dist_to_oncoMix_centre"] = 
            Math.sqrt(Math.pow(vertex.x - oncoMix_centre.x, 2) + Math.pow(vertex.y - oncoMix_centre.y, 2));
    });
    _sortByKey(unassigned_real_vertices, "dist_to_oncoMix_centre");
    unassigned_real_vertices.reverse();

    // choose cluster centres (random outskirts of oncoMix)
    var centres = unassigned_real_vertices.slice(0, gtypes.length);
    gtypes.forEach(function(gtype, gtype_i) {
        centres[gtype_i]["clust_gtype"] = gtype;
    })

    // order coordinates by distance for each cluster centre, and assign
    centres.forEach(function(centre) {
        var cur_gtype = centre.clust_gtype;

        // get distances to cluster centre
        unassigned_real_vertices.forEach(function(vertex) {
            vertex["dist_to_clust_centre"] = 
                Math.sqrt(Math.pow(vertex.x - centre.x, 2) + Math.pow(vertex.y - centre.y, 2));
        });

        // order vertices by distance to cluster centre
        _sortByKey(unassigned_real_vertices, "dist_to_clust_centre");

        // for each cell in this cluster, assign the cluster to a vertex & place vertex in assigned array
        for (var i = 0; i < gtypes_and_ncells[cur_gtype]; i++) {
            if (unassigned_real_vertices.length > 0) { // we haven't exceeded our cell count

                // note colour for this vertex, based on appropriate genotype
                unassigned_real_vertices[0].col = curVizObj.view.colour_assignment[cur_gtype];

                // note the genotype for this vertex
                unassigned_real_vertices[0].gtype = cur_gtype;

                assigned_real_vertices.push(unassigned_real_vertices.shift());
            }
        }
    })

    // append fake cells onto the end of the real cells
    var all_vertices = assigned_real_vertices.concat(fake_vertices);
    return all_vertices;

}

/* function to get positions of sample tab, dividers, voronoi tesselation centre, tree centre for each sample
* @param {Object} curVizObj -- vizObj for the current view
*/
function _getSamplePositioning(curVizObj) {
    var dim = curVizObj.generalConfig,
        n_samples = curVizObj.data.sample_ids.length; // number of samples

    // for each sample
    curVizObj.data.samples.forEach(function(cur_sample_obj, sample_idx) {
        var sample_id = cur_sample_obj.sample_id;

        // left divider
        cur_sample_obj["leftDivider"] = {
            x1: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.innerRadius, sample_idx, n_samples).x,
            y1: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.innerRadius, sample_idx, n_samples).y,
            x2: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius - 2, sample_idx, n_samples).x,
            y2: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius - 2, sample_idx, n_samples).y
        }

        // VORONOI

        // voronoi placement
        cur_sample_obj["voronoi"] = {};
        cur_sample_obj["voronoi"]["centre"] = {
            x: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, sample_idx+0.5, n_samples).x,
            y: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, sample_idx+0.5, n_samples).y
        }
        cur_sample_obj["voronoi"]["top_l_corner"] = {
            x: cur_sample_obj["voronoi"]["centre"].x - dim.oncoMixWidth/2,
            y: cur_sample_obj["voronoi"]["centre"].y - dim.oncoMixWidth/2
        }

        // voronoi vertices (randomly fill a rectangle, keeping all within a certain 
        // radius from the centre as "real cells", all others as "fake cells")
        var vertices = _getVoronoiVertices(
                curVizObj, 
                cur_sample_obj["voronoi"]["centre"].x,
                cur_sample_obj["voronoi"]["centre"].y,
                sample_idx + 1
            );

        // order vertices, add colour (genotype) information to each vertex
        vertices_ordered = _colourOncoMix(curVizObj, vertices, sample_id, cur_sample_obj["voronoi"]["centre"]);
        cur_sample_obj["voronoi"]["vertices"] = vertices_ordered;

        // note real vertices
        cur_sample_obj["voronoi"]["real_vertices"] = 
            $.extend([], _.filter(vertices_ordered, function(vertex) { return vertex.real_cell; }));

        // 2D array of x- and y- positions for vertices
        cur_sample_obj["voronoi"]["vertex_coords"] = vertices_ordered.map(function(vertex) {
            return [vertex.x, vertex.y];
        });

        // TAB 

        //placement
        cur_sample_obj["tab"] = {
            startAngle: 
                _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, sample_idx+0.05, n_samples).angle 
                + Math.PI/2, // not sure why it's shifted by 90 degrees..
            endAngle: 
                _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, sample_idx+0.95, n_samples).angle 
                + Math.PI/2
        };

        // MIDDLE ANGLE
        cur_sample_obj["angle"] = 
            (_drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, sample_idx+0.05, n_samples).angle +
            _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.outerRadius, sample_idx+0.95, n_samples).angle)/2;


        // TREE

        cur_sample_obj["tree"] = {};
        cur_sample_obj["tree"]["centre"] = {
            x: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, sample_idx+0.5, n_samples).x,
            y: _drawPoint(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, sample_idx+0.5, n_samples).y
        }
        cur_sample_obj["tree"]["top_l_corner"] = {
            x: cur_sample_obj["tree"]["centre"].x - dim.treeWidth/2,
            y: cur_sample_obj["tree"]["centre"].y - dim.treeWidth/2
        }
        cur_sample_obj["tree"]["top_middle"] = {
            x: cur_sample_obj["tree"]["centre"].x,
            y: cur_sample_obj["tree"]["centre"].y - dim.treeWidth/2
        }
        cur_sample_obj["tree"]["bottom_middle"] = {
            x: cur_sample_obj["tree"]["centre"].x,
            y: cur_sample_obj["tree"]["centre"].y + dim.treeWidth/2
        }

        // PURE, MONOPHYLETIC, OR POLYPHYLETIC SITE
        var phyly;
        var sample_gtypes = curVizObj.data["sample_genotypes"][sample_id];
        // pure tumour
        if (sample_gtypes.length == 1) {
            phyly = "pure";
        }
        // monophyletic tumour
        else {
            for (var i = 0; i < sample_gtypes.length; i++) {
                var gtypeAndAncestors = curVizObj.data.treeAncestorsArr[sample_gtypes[i]].slice();
                gtypeAndAncestors.push(sample_gtypes[i]);
                if (_getIntersection(gtypeAndAncestors, sample_gtypes).length == sample_gtypes.length) {
                    phyly = "monophyletic";
                }
            }
        }
        // polyphyletic tumour
        if (["monophyletic","pure"].indexOf(phyly) == -1) {
            phyly = "polyphyletic";
        }
        cur_sample_obj["phyly"] = phyly;
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

/* function to get order of the samples, then reorder the curVizObj.data.samples 
* array accordingly.
* @param {Object} curVizObj -- vizObj for the current view
*/
function _reorderSitesData(curVizObj) {
    var view_id = curVizObj.view_id;
    var samples = [];

    curVizObj.data.sample_ids.forEach(function(sample_id) {

        // current transformation of the sample title
        var t = d3.transform(d3.select("#" + view_id).select(".sampleTitle.sample_"+sample_id.split(' ').join('_')).attr("transform")),
            t_x = t.translate[0],
            t_y = t.translate[1];

        // current coordinates
        var x = (t) ? 
                    parseFloat(d3.select("#" + view_id).select(".sampleTitle.sample_"+sample_id.split(' ').join('_')).attr("x")) + t_x :
                    parseFloat(d3.select("#" + view_id).select(".sampleTitle.sample_"+sample_id.split(' ').join('_')).attr("x"));
        var y = (t) ? 
                    parseFloat(d3.select("#" + view_id).select(".sampleTitle.sample_"+sample_id.split(' ').join('_')).attr("y")) + t_y :
                    parseFloat(d3.select("#" + view_id).select(".sampleTitle.sample_"+sample_id.split(' ').join('_')).attr("y"));

        // depending on placement of title, move y-coordinate up or down
        y = (d3.select("#" + view_id).select(".sampleTitle.sample_"+sample_id.split(' ').join('_')).data()[0].position == "top") ? 
            y + curVizObj.generalConfig.treeWidth/2 :
            y - curVizObj.generalConfig.treeWidth/2;

        // find the angle formed with the positive x-axis, by the line segment from the title to the view centre
        var angle = _find_angle_of_line_segment({x: x, 
                                                    y: y},
                                                {x: curVizObj.generalConfig.viewCentre.x, 
                                                    y: curVizObj.generalConfig.viewCentre.y});
        samples.push({
            "sample_id": sample_id,
            "angle": angle
        })
    })

    // get the sample order
    _sortByKey(samples, "angle");
    var sample_order = _.pluck(samples, "sample_id");

    // rearrange curVizObj.data.samples array to reflect new ordering
    var new_samples_array = [];
    sample_order.forEach(function(sample_id) {
        new_samples_array.push(_.findWhere(curVizObj.data.samples, {sample_id: sample_id}));
    })

    // if we crossed the x-axis, adjust sample order so the least number of samples move
    var clockwise_x_cross_angle = (2*Math.PI - curVizObj.view.startAngle) + curVizObj.view.endAngle;
    var counterclockwise_x_cross_angle = curVizObj.view.startAngle + (2*Math.PI - curVizObj.view.endAngle);
    if ((curVizObj.view.startAngle > 3*Math.PI/2) && 
        (curVizObj.view.endAngle < Math.PI) &&
        (clockwise_x_cross_angle < Math.PI)) {
        new_samples_array.push(new_samples_array.shift());
    }
    else if ((curVizObj.view.startAngle < Math.PI/2) && 
        (curVizObj.view.endAngle > Math.PI) &&
        (counterclockwise_x_cross_angle < Math.PI)) {
        new_samples_array.unshift(new_samples_array.pop());
    }
    else if ((curVizObj.view.startAngle > Math.PI) && 
        (curVizObj.view.endAngle < Math.PI/2) &&
        (clockwise_x_cross_angle < Math.PI)) {
        new_samples_array.push(new_samples_array.shift());
    }
    else if ((curVizObj.view.startAngle < Math.PI) && 
        (curVizObj.view.endAngle > 3*Math.PI/2) &&
        (counterclockwise_x_cross_angle < Math.PI)) {
        new_samples_array.unshift(new_samples_array.pop());
    }

    curVizObj.data.samples = new_samples_array;
}

/* function to visually reposition samples to their "snapped" location
* @param {Object} curVizObj -- vizObj for the current view
*/ 
function _snapSites(curVizObj) {
    var view_id = curVizObj.view_id,
        dim = curVizObj.generalConfig;

    // for each sample
    curVizObj.data.sample_ids.forEach(function(sample, sample_idx) {

        // get the data
        var sample_data = _.findWhere(curVizObj.data.samples, {sample_id: sample}), // data for the current sample
            cur_sampleG = d3.select("#" + view_id).select(".sampleG.sample_" + sample.split(' ').join('_')); // svg group for this sample

        // calculate angle w/the positive x-axis, formed by the line segment between the 
        // "snapped" sample position & view centre
        var angle = _find_angle_of_line_segment(
                        {x: sample_data.voronoi.centre.x, y: sample_data.voronoi.centre.y},
                        {x: dim.viewCentre.x, y: dim.viewCentre.y});

        // move anatomic lines
        if (sample_data.location) { // if the sample was found on the anatomic image
            cur_sampleG.select(".anatomicPointer.sample_" + sample.split(' ').join('_'))
                .transition()
                .attr("x1", function(d) {
                    d.x1 = sample_data.voronoi.centre.x;
                    return d.x1;
                })
                .attr("y1", function(d) {
                    d.y1 = sample_data.voronoi.centre.y;
                    return d.y1;
                })
                .attr("x2", function(d) { 
                    return curVizObj.data.anatomic_locations[sample_data.location.location_id]["cropped_coords"].x;
                })
                .attr("y2", function(d) { 
                    return curVizObj.data.anatomic_locations[sample_data.location.location_id]["cropped_coords"].y;
                });  
        }

        // move oncoMix
        d3.select("#" + view_id).select(".oncoMixG.sample_"+sample.split(' ').join('_'))
            .transition()
            .attr("transform", function(d) {
                var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToOncoMix, angle);
                return "translate(" + (point.x-d.x) + "," + (point.y-d.y) + ")";
            });

        // move tree (keep track of translation)
        var translation = {};
        d3.select("#" + view_id).select(".treeG.sample_"+sample.split(' ').join('_'))
            .transition()
            .attr("transform", function(d) {
                var point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, dim.radiusToTree, angle);
                    translation = {x: (point.x-d.x), y: (point.y-d.y)};
                return "translate(" + translation.x + "," + translation.y + ")";
            });

        // move sample title (keep track of translation)
        // change sample title location (depending on placement of sample, above or below view centre)
        var translation = {};
        d3.select("#" + view_id).select(".sampleTitle.sample_"+sample.split(' ').join('_'))
            .transition()
            .attr("transform", function(d) {
                var r = Math.sqrt(Math.pow(d.x - dim.viewCentre.x, 2) + 
                                    Math.pow(d.y - dim.viewCentre.y, 2)),
                    point = _drawPointGivenAngle(dim.viewCentre.x, dim.viewCentre.y, r, angle);
                    translation = {x: (point.x-d.x), y: (point.y-d.y)};
                return "translate(" + translation.x + "," + translation.y + ")";
            })
            .attr("y", function(d) {
                if (sample_data.angle > Math.PI && sample_data.angle < 2*Math.PI) {
                    d.position = "top";
                    return sample_data.tree.top_middle.y - translation.y;
                }
                d.position = "bottom";
                return sample_data.tree.bottom_middle.y - translation.y;
            })
            .attr("dy", function(d) {
                if (sample_data.angle > Math.PI && sample_data.angle < 2*Math.PI) {
                    d.position = "top";
                    return "+0.71em";
                }
                d.position = "bottom";
                return "0em";
            })

    });
}

/* function to plot all the elements for this sample (oncoMix, tree, title, anatomic lines, anatomic marks)
* @param {Object} curVizObj -- vizObj for the current view
* @param {String} sample -- current anatomic sample
* @param {Object} drag -- drag object
*/
function _plotSite(curVizObj, sample, drag) {
    var view_id = curVizObj.view_id,
        dim = curVizObj.generalConfig,
        sample_data = _.findWhere(curVizObj.data.samples, {sample_id: sample}), // data for the current sample
        cur_sampleG = d3.select("#" + view_id).select(".sampleG.sample_" + sample.split(' ').join('_')), // svg group for this sample
        cols = curVizObj.view.colour_assignment;

    // TOOLTIP FUNCTIONS

    // tip for sample titles, if they're too long to display
    var sampleTitleTip = d3.tip()
        .attr('class', 'd3-tip')
        .offset([-10, 0])
        .html(function(d) {
            return "<span style='color:white; font-family: Arial; font-weight:normal'>" +
                "Site: " + d.sample + "</span>";
        });
    d3.select("#" + view_id).select(".spacesweep_" + view_id).call(sampleTitleTip);

    // PLOT ANATOMIC LINES

    // if the sample was found on the anatomic image
    if (sample_data.location) {
        cur_sampleG
            .append("line")
            .classed("anatomicPointer", true)
            .classed("sample_" + sample.split(' ').join('_'), true)
            .attr("x1", function(d) {
                d.x1 = sample_data.voronoi.centre.x;
                return d.x1;
            })
            .attr("y1", function(d) {
                d.y1 = sample_data.voronoi.centre.y;
                return d.y1;
            })
            .attr("x2", function(d) { 
                return curVizObj.data.anatomic_locations[sample_data.location.location_id]["cropped_coords"].x;
            })
            .attr("y2", function(d) { 
                return curVizObj.data.anatomic_locations[sample_data.location.location_id]["cropped_coords"].y;
            })
            .attr("stroke", dim.anatomicLineColour)
            .attr("stroke-width", "2px");  
    }

    // PLOT ANATOMIC MARKS - marks on image 

    // if the sample was found on the anatomic image
    if (sample_data.location) {
        d3.select("#" + view_id)
            .select(".anatomicMarksG")
            .append("g")
            .attr("class", function() { return "gtypeMarksG sample_" + sample.split(' ').join('_'); })
            .selectAll(".gtypeMark")
            .data(curVizObj.data.sample_genotypes[sample])
            .enter()
            .append("circle")
            .attr("class", function(d) { 
                return "gtypeMark clone_" + d.split(' ').join('_'); 
            })
            .attr("cx", function(d) { 
                return curVizObj.data.anatomic_locations[sample_data.location.location_id]["cropped_coords"].x;
            })
            .attr("cy", function(d) { 
                return curVizObj.data.anatomic_locations[sample_data.location.location_id]["cropped_coords"].y;
            })
            .attr("r", dim.sampleMark_r)
            .attr("fill", function(d) { 
                return cols[d];
            })
            .attr("fill-opacity", 0)
            .attr("pointer-events", "none");
    }

    // PLOT ONCOMIX

    // create oncoMix group
    var curSiteOncoMixG = cur_sampleG
        .selectAll(".oncoMixG")
        .data([{"x": sample_data.voronoi.centre.x, "y": sample_data.voronoi.centre.y, "sample": sample}])
        .enter()
        .append("g")
        .classed("oncoMixG", true)
        .classed("sample_" + sample.split(' ').join('_'), true)
        .style("cursor", "pointer")
        .call(drag);

    // voronoi function for this sample
    var voronoi = d3.geom.voronoi()
        .clipExtent([[sample_data.voronoi.top_l_corner.x, 
                    sample_data.voronoi.top_l_corner.y], 
                    [sample_data.voronoi.top_l_corner.x + dim.oncoMixWidth, 
                    sample_data.voronoi.top_l_corner.y + dim.oncoMixWidth]]);

    // plot opaque white cells first (to cover up the anatomic line)
    var vertices = sample_data.voronoi.vertices;
    var whiteCells = curSiteOncoMixG.append("g")
        .classed("whiteCellsG", true)
        .classed("sample_" + sample.split(' ').join('_'), true)
        .selectAll("path")
        .data(voronoi(sample_data.voronoi.vertex_coords), _polygon)
        .enter().append("path")
        .attr("class", "whiteCell")
        .attr("d", _polygon)
        .attr("fill", function(d, i) {
            return (vertices[i].real_cell) ? "white" : "none";
        })
        .attr("fill-opacity", function(d, i) {
            return (vertices[i].real_cell) ? 1 : 0;
        })
        .attr("stroke", function(d, i) {
            return (vertices[i].real_cell) ? "white" : "none";
        })
        .attr("stroke-width", "1.5px")
        .attr("stroke-opacity", function(d, i) {
            return (vertices[i].real_cell) ? 1 : 0;
        });

    // plot cells
    var vertices = sample_data.voronoi.vertices;
    var cells = curSiteOncoMixG.append("g")
        .classed("cellsG", true)
        .classed("sample_" + sample.split(' ').join('_'), true)
        .selectAll("path")
        .data(voronoi(sample_data.voronoi.vertex_coords), _polygon)
        .enter().append("path")
        .attr("class", function(d, i) {
            if (vertices[i].real_cell) {
                return "voronoiCell sample_" + sample.split(' ').join('_') + " clone_" + vertices[i].gtype.split(' ').join('_');
            }
            return "voronoiCell sample_" + sample.split(' ').join('_');
        })
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
        node.y = node.x + dim.node_r + sample_data.tree.top_l_corner.y;
        node.x = node.tmp + dim.node_r + sample_data.tree.top_l_corner.x;
        delete node.tmp;
    });

    // tree group
    var treeG = cur_sampleG
        .selectAll(".treeG")
        .data([{"x": sample_data.tree.centre.x, "y": sample_data.tree.centre.y}])
        .enter()
        .append("g")
        .classed("treeG", true)
        .classed("sample_" + sample.split(' ').join('_'), true);

    // create links
    var linkG = treeG
        .append("g")
        .attr("class","treeLinkG")

    linkG.selectAll(".treeLink")                  
        .data(links)                   
        .enter().append("path")                   
        .attr("class", function(d) {
            d.link_id = "treeLink_" + d.source.id + "_" + d.target.id;
            return "treeLink sample_" + sample.split(' ').join('_') + " " + d.link_id;
        })
        .attr('stroke', '#9E9A9A')
        .attr('fill', 'none') 
        .attr('stroke-width', '2px')               
        .attr("d", function(d) {
            return _elbow(d);
        });     

    // filter links to show only branches that connect genotypes expressed at this sample
    var filtered_links = [];

    // add the most recent common ancestor for this set of genotypes
    var gtypes_to_plot = $.extend([], curVizObj.data.sample_genotypes[sample]); // genotypes expressed at this anatomic sample
    gtypes_to_plot.push(_getMRCA(curVizObj, gtypes_to_plot));
    gtypes_to_plot = _.uniq(gtypes_to_plot);

    links.forEach(function(link) {

        var source = link.source.id,
            target = link.target.id,
            source_and_ancestors = $.extend([], curVizObj.data.treeAncestorsArr[source]),
            target_and_descendants = $.extend([], curVizObj.data.treeDescendantsArr[target]);
        source_and_ancestors.push(source);
        target_and_descendants.push(target);

        // if the source (or ancestors) and target (or descendants) are expressed at this anatomic sample
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
        .classed("sample_" + sample.split(' ').join('_'), true)
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
        .attr("cx", function(d) { return d.x; })
        .attr("cy", function(d) { return d.y; })             
        .attr("class", function(d) {
            return "treeNode sample_" + sample.split(' ').join('_') + " clone_" + d.id.split(' ').join('_');
        })
        .attr("fill", function(d) {
            // clone present at this sample or not
            return (curVizObj.data["sample_genotypes"][sample].indexOf(d.id) != -1) ? 
                cols[d.id] : "#FFFFFF";
        })
        .attr("stroke", function(d) {
            // clone present at this sample or not
            return (curVizObj.data["sample_genotypes"][sample].indexOf(d.id) != -1) ? 
                cols[d.id] : "#FFFFFF";
        })
        .attr("r", function(d) {
            // clone present at this sample or not
            return (curVizObj.data["sample_genotypes"][sample].indexOf(d.id) != -1) ? dim.node_r : 0;
        })
        .on('mouseover', function(d) {
            d.sample = sample;
            // if there are no selections
            if (_checkForSelections(curVizObj)) {
                var view_id = curVizObj.view_id;

                // plot clonal prevalence text
                _plotClonalPrevText(curVizObj, d.sample, d.id);

                // shade this oncoMix
                d3.select("#" + view_id).selectAll(".voronoiCell.sample_" + sample.split(' ').join('_'))
                    .attr("fill-opacity", dim.shadeAlpha)
                    .attr("stroke-opacity", dim.shadeAlpha);

                // highlight oncoMix cells with this genotype
                d3.select("#" + view_id)
                    .selectAll(".voronoiCell.clone_" + d.id.split(' ').join('_') + ".sample_" + sample.split(' ').join('_'))
                    .attr("fill-opacity", 1)
                    .attr("stroke-opacity", 1);
            }
        })
        .on('mouseout', function(d) {
            if (_checkForSelections(curVizObj)) {
                // remove clonal prevalence text
                d3.select("#" + view_id).select(".clonalPrev").remove();

                // reset view
                _resetView(curVizObj);
            }
        });

    // PLOT SITE TITLES

    cur_sampleG
        .selectAll(".sampleTitle")
        .data([{"x": sample_data.tree.centre.x, "y": sample_data.tree.centre.y}])
        .enter()
        .append("text")
        .classed("sampleTitle", true)
        .classed("sample_" + sample.split(' ').join('_'), true)
        .attr("x", sample_data.tree.top_middle.x)
        .attr("y", function(d) {
            // set sample name in data object
            d.sample = sample_data.sample_id;

            if (sample_data.angle > Math.PI && sample_data.angle < 2*Math.PI) {
                d.position = "top";
                return sample_data.tree.top_middle.y;
            }
            d.position = "bottom";
            return sample_data.tree.bottom_middle.y;
        })
        .attr("dy", function(d) {
            if (sample_data.angle > Math.PI && sample_data.angle < 2*Math.PI) {
                return "+0.71em";
            }
            return "0em";
        })
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial")
        .attr("font-size", dim.viewDiameter/40)
        .attr("fill", dim.legendTitleColour)
        .style("cursor", "pointer")
        .text(function(d) { 
            // get original sample name (spaces may have been replaced with underscores)
            var sample_name = 
                _.findWhere(curVizObj.userConfig.sample_id_map, {"space_replaced_sample_id": d.sample})["original_sample_id"];

            // if title is too long, append "..." to the first few letters
            if (sample_name.length > 6) {
                return sample_name.slice(0,6) + "...";
            }
            return sample_name; 
        })
        .on("mouseover", function(d) { 
            if (!dim.selectOn) {
                // if title is too long, make mouseover to see full name
                if (d.sample.length > 6) {
                    return sampleTitleTip.show(d);
                }
            }
        })
        .on("mouseout", function(d) {
            if (!dim.selectOn) {
                // if title is too long, make mouseout to hide full name
                if (d.sample.length > 6) {
                    return sampleTitleTip.hide(d);
                }
            }
        })
        .call(drag);

}

/* initial ordering of samples based on their anatomic locations 
* (angle with positive x-axis, formed by the line segment between the sample position on the image & view centre)
* @param {Object} curVizObj -- vizObj for the current view
*/
function _initialSiteOrdering(curVizObj) {
    var samples = [], // samples and their y-coordinates
        dim = curVizObj.generalConfig;

    // for each sample
    curVizObj.data.samples.forEach(function(sample) {
        // anatomic location detected
        if (sample.location) {

            // cropped x, y positions 
            var bounds = curVizObj.view.sampleBounds;

            // calculate angle w/the positive x-axis, formed by the line segment between the 
            // sample position & view centre
            var angle = _find_angle_of_line_segment(
                            {x: sample.location.x, y: sample.location.y},
                            {x: bounds.centre.x, y: bounds.centre.y});

            samples.push({
                "sample_id": sample.sample_id,
                "location": sample.location.location_id,
                "angle": angle
            });
        }
        // if no anatomic location detected
        else {
            samples.push({
                "sample_id": sample.sample_id,
                "location": "NA", // no sample location found
                "angle": Math.PI/2 // auto position is on the bottom of the view (pi/2 from positive x-axis)
            });
        }
    });

    // sort samples by y-direction and location
    _sortByKey(samples, "angle", "location");

    // rearrange curVizObj.data.samples array to reflect new ordering
    var new_samples_array = [];
    samples.forEach(function(sample) {
        new_samples_array.push(_.findWhere(curVizObj.data.samples, {sample_id: sample.sample_id}));
    })
    curVizObj.data.samples = new_samples_array;
}

/* function to sort samples based on user input sample ordering
* @param {Object} curVizObj -- vizObj for the current view
* @param sample_ids -- array of sample ids provided by user
*/
function _orderSamplesByUserInput(curVizObj, sample_ids) {
    var samples = curVizObj.data.samples;
    var new_samples_array = [];

    sample_ids.forEach(function(id) {
        new_samples_array.push(_.findWhere(curVizObj.data.samples, {sample_id: id}));
    })
    curVizObj.data.samples = new_samples_array;
}

// MUTATION FUNCTIONS

/* function to get the mutations into a better format
* @param {Object} curVizObj -- vizObj for the current view
*/
function _reformatMutations(curVizObj) {
    var original_muts = curVizObj.userConfig.mutations, // muts from user data
        muts_arr = [];

    // convert object into array
    original_muts.forEach(function(mut) {

        // link id where mutation occurred
        var link_id = "treeLink_" + curVizObj.data.direct_ancestors[mut.clone_id] + "_" +  mut.clone_id;

        // samples affected by this mutation
        var affected_samples = curVizObj.data.link_affected_samples[mut.clone_id];

        // sample locations for affected samples
        var sample_locations = [];
        affected_samples.forEach(function(sample) {
            var cur_sample = _.findWhere(curVizObj.data.samples, {sample_id: sample});
            if (cur_sample.location) {
                sample_locations.push(cur_sample.location.location_id);
            }
        })
        sample_locations = _.uniq(sample_locations);

        // add this gene to the array
        var cur_mut = {
            "chrom": mut.chrom,
            "coord": mut.coord,
            "empty": "", // add an empty string for an empty column (clone column) that will contain an SVG
            "clone_id": mut.clone_id,
            "link_id": link_id,
            "affected_samples": affected_samples,
            "sample_locations": sample_locations
        }
        if (mut.hasOwnProperty("gene_name")) {
            cur_mut["gene_name"] = mut.gene_name;
        }
        if (mut.hasOwnProperty("effect")) {
            cur_mut["effect"] = mut.effect;
        }
        if (mut.hasOwnProperty("impact")) {
            cur_mut["impact"] = mut.impact;
        }
        muts_arr.push(cur_mut);
    });

    curVizObj.data.mutations = muts_arr;
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

/* given the start point, slope, distance and circle-half of a line segment, this function finds the endpoint
* @param {Object} start -- x- and y- coordinates for starting point of the new line segment
* @param {Number} slope -- slope of the new line segment
* @param {Number} dist -- distance of the new line segment
* @param {Boolean} leftHalf -- whether or not the endpoint is in the left half
*/
function _findEndpoint(start, slope, dist, leftHalf) {
    var cosTheta = 1/Math.sqrt(1 + Math.pow(slope,2));
    var sineTheta = slope/Math.sqrt(1 + Math.pow(slope,2));
    var dx = dist*cosTheta;
    var dy = dist*sineTheta;
    var x = (leftHalf) ? start.x + dx : start.x - dx;
    var y = (leftHalf) ? start.y + dy : start.y - dy;
    return {x: x, y: y};
}

/* find the coordinates of a point a certain distance another point, getting the
* slope of the distance from a d3 line object
* @param {Object} d3_line_object -- d3 line object
* @param {Number} dist -- desired distance from starting point on line
* @param {String} start_point -- which end of the line object to start from (either "1" or "2")
* @return coordinates for the point a certain distance from a starting point
*/
function _fromLineGetPoint(d3_line_object, dist, start_point) {
    
    // slope of anatomic line
    var x1 = parseFloat(d3_line_object.attr("x1"));
    var y1 = parseFloat(d3_line_object.attr("y1"));
    var x2 = parseFloat(d3_line_object.attr("x2"));
    var y2 = parseFloat(d3_line_object.attr("y2"));
    var slope = (y1-y2)/(x1-x2);

    var add = true;
    if ((x1-x2) < 0) { // left half of the circle
        add = false;
    }

    // calculate position a certain distance from the starting point
    var start = (start_point == "1") ? {x: x1, y: y1} : {x: x2, y: y2};
    var coords = _findEndpoint(start, slope, dist, add);

    return coords;
}

function RNG(seed) {
  // LCG using GCC's constants
  this.m = 0x80000000; // 2**31;
  this.a = 1103515245;
  this.c = 12345;

  this.state = seed ? seed : Math.floor(Math.random() * (this.m-1));
}
RNG.prototype.nextInt = function() {
  this.state = (this.a * this.state + this.c) % this.m;
  return this.state;
}
RNG.prototype.nextFloat = function() {
  // returns in range [0,1]
  return this.nextInt() / (this.m - 1);
}
RNG.prototype.nextRange = function(start, end) {
  // returns in range [start, end): including start, excluding end
  // can't modulu nextInt because of weak randomness in lower bits
  var rangeSize = end - start;
  var randomUnder1 = this.nextInt() / this.m;
  return start + Math.floor(randomUnder1 * rangeSize);
}
RNG.prototype.choice = function(array) {
  return array[this.nextRange(0, array.length)];
}


/* random number generator [0,1], 
* from http://stackoverflow.com/questions/521295/javascript-random-seeds
* @param {Object} curVizObj -- vizObj for the current view
*/
function _random(curVizObj) {
    var x = Math.sin(curVizObj.seed++) * 10000;
    return x - Math.floor(x);
}

/* function to download PNG
* @param className -- name of the class of the svg to download (e.g. "mySVG")
* @param fileOutputName -- filename for output
*/
function _downloadPNG(className, fileOutputName) {
    var html = d3.select("." + className)
        .attr("version", 1.1)
        .attr("xmlns", "http://www.w3.org/2000/svg")
        .node().parentNode.innerHTML;

    var imgsrc = 'data:image/svg+xml;base64,'+ btoa(html);
  
    var canvas = document.querySelector("canvas"),
        context = canvas.getContext("2d");

    var image = new Image;
    image.src = imgsrc;
    image.onload = function() {
        context.drawImage(image, 0, 0);

        var canvasdata = canvas.toDataURL("image/png");

        var pngimg = '<img src="'+canvasdata+'">'; 

        var a = document.createElement("a");
        a.download = fileOutputName;
        a.href = canvasdata;
        a.click();
    };
}