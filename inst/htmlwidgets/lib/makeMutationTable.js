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

	// make deferred object for mutation table setup
	curVizObj.mutTableDef = new $.Deferred();

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
			        { "data": "empty", 
			        	"title": "Clone" }
			    ],
		    "scrollY":        table_height - 90, // - 90 for search bar, etc.
	        "scrollCollapse": true,
	        "paging":         false,
	        "info": 		  false,
       		"aaSorting": [] // disable initial sort
	    });

	    curVizObj.mutTableDef.resolve("Finished creating table setup.")
	});	

	// when mutation table is set up
	curVizObj.mutTableDef.done(function() {

		// d3 effects
		$("#" + curVizObj.view_id + "_mutationTable")
	        .on('click', 'tr', function () { 
	        	dim.mutSelectOn = !dim.mutSelectOn;

	        	// MUTATION SELECTED

	        	if (dim.mutSelectOn) {

		        	// data for the row on mouseover
		        	var cur_data = table.rows(this).data()[0];
		        	if (!dim.selectOn && !dim.dragOn) {

		        		// shade main view & legend tree nodes & links
	                    _shadeMainView(curVizObj);
                    	_shadeLegend(curVizObj);

	                    // highlight all elements downstream of link
	                    _propagatedEffects(curVizObj, cur_data.link_id, curVizObj.link_ids, "downstream");

		        		// mark as selected
	        			$(this).addClass('selected');
		            }        		
	        	}

	        	// MUTATION DE-SELECTED (click anywhere in table)

	        	else {
	        		_backgroundClick(curVizObj)
	        	}

	        });


		// add clone SVGs
		var rows = d3.select("#" + curVizObj.view_id + "_mutationTable").selectAll("tr");
		var svgColumn = rows.selectAll("td:nth-child(4)")
			.append("div")
			.style("height","100%")
	        .style("width","100%"); 
	    var i = 0;
	    var svgCircle = svgColumn
	                .append("svg")
	                .attr("width", 10)
	                .attr("height", 10)
	                .attr("class","svgCell")
	                .append("circle")
	                .attr("cx", 5)
	                .attr("cy", 5)
	                .attr("r", 4)
	                .attr("fill", function(d) {
	                	return curVizObj.view.colour_assignment[data[i++].clone_id];
	                });
    })
}
