// MUTATION TABLE FUNCTIONS

/* function to make mutation table
* @param {Object} curVizObj -- vizObj for the current view
* @param {Object} mutationTableDIV -- DIV for mutation table
* @param {Array} data -- data to plot within table
* @param {Number} table_height -- height of the table (in px)
*/
function _makeMutationTable(curVizObj, mutationTableDIV, data, sort_by, table_height) {

    // create table skeleton
  	var theTable = mutationTableDIV.append("table")
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
	        "paging":         false
	    });
	});	

}
