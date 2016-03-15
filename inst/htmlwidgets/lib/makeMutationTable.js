// MUTATION TABLE FUNCTIONS

/* function to make mutation table
* @param {Object} curVizObj -- vizObj for the current view
* @param {Object} mutationTableDIV -- DIV for mutation table
* @param {Array} data -- data to plot within table
* @param {Number} table_height -- height of the table (in px)
*/
function _makeMutationTable(curVizObj, mutationTableDIV, data, sort_by, table_height) {
	var dim = curVizObj.generalConfig;
	var table;

    // create table skeleton
  	mutationTableDIV.append("table")
  		.attr("class", "display compact")
    	.attr("id", function() { return curVizObj.view_id + "_mutationTable"; });

    // create data table
	$(document).ready(function() {
	    table = $("#" + curVizObj.view_id + "_mutationTable").DataTable({
	      	"data": data,
	      	"columns": [
			        { "data": "chrom",
			        	"title": "Chromosome" },
			        { "data": "coord",
			        	"title": "Coordinate" },
			        { "data": "gene_name",
			        	"title": "Gene Name" },
			        { "data": "clone_id",
			        	"title": "Clone ID" }
			    ],
		    "scrollY":        table_height - 90, // - 90 for search bar, etc.
	        "scrollCollapse": true,
	        "paging":         false,
	        "info": 		  false
	    });
	});	


	// d3 effects
	$("#" + curVizObj.view_id + "_mutationTable")
        .on('click', 'tr', function () { 
        	dim.mutSelectOn = !dim.mutSelectOn;

        	// MUTATION SELECTED

        	if (dim.mutSelectOn) {

	        	// data for the row on mouseover
	        	var cur_data = table.rows(this).data()[0];
	        	if (!dim.selectOn && !dim.dragOn) {
	        		// mark as selected
        			$(this).addClass('selected');

	        		// shade all legend tree links
	        		d3.select("#" + curVizObj.view_id)
	        			.selectAll(".legendTreeLink")
	        			.attr("stroke-opacity", dim.shadeAlpha);

	                // highlight legend tree link where this mutation occurred
	                d3.select("#" + curVizObj.view_id)
	                	.select("." + cur_data.link_id)
	                	.attr("stroke", "red")
	                	.attr("stroke-opacity", 1);

	                // shade view
	                _shadeMainView(curVizObj, curVizObj.view_id);

	                // highlight sites
	                _highlightSites(cur_data.affected_sites, curVizObj.view_id);

	                // highlight general anatomic marks
	                cur_data.site_stems.forEach(function(stem) {
	                    d3.select("#" + curVizObj.view_id).select(".generalMark.stem_"+stem)
	                        .attr("fill", dim.generalMarkHighlightColour);
	                });
	            }        		
        	}

        	// MUTATION DE-SELECTED (click anywhere in table)

        	else {
        		_backgroundClick(curVizObj)
        	}

        });
}
