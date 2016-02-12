HTMLWidgets.widget({

  name: 'spacesweep',

  type: 'output',

  initialize: function(el, width, height) {

    // defaults
    var defaults = {
        padding: 15,
        legendWidth: 100,
        treeHeight: 100,
        treeWidth: 100,
        smallMargin: 5,
        widgetMargin: 10, // marging between widgets
        gridsterBaseDimension: 120,
        panel_width: 30,
        fontSize: 11,
        rootColour: '#DDDADA',
        threshold: 0.005, // cellular prevalence threshold of visual detection
        legendGtypeHeight: 13, // height for each genotype in the legend
        patientTabWidth: 40
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

    console.log("vizObj");
    console.log(vizObj);

    // TODO for each site....

    // TREE SVG

    var treeSVG = containerDIV.append("svg:svg")
        .attr("class", "treeSVG")
        .attr("x", 0)
        .attr("y", 0) 
        .attr("width", dim.width) 
        .attr("height", dim.height);


    // PLOT TREE GLYPH

    // plot tree title
    var treeTitle = treeSVG
        .append('text')
        .attr('class', 'treeTitle')
        .attr('x', 0)
        .attr('y', 0)
        .attr('dy', '.71em')
        .text('Tree'); 

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
    var link = treeSVG.append("g")
        .classed("treeLinks", true)
        .selectAll(".treeLink")                  
        .data(links)                   
        .enter().append("path")                   
        .attr("class","treeLink")
        .attr('stroke', 'black')
        .attr('fill', 'none')                
        .attr("d", _elbow); 

    // create nodes
    var node = treeSVG.selectAll(".treeNode")                  
        .data(nodes)                   
        .enter()
        .append("circle")     
        .attr("cx", function(d) { return d.x})
        .attr("cy", function(d) { return d.y})              
        .classed("treeNode", true) 
        .attr("fill", function(d) {
            return alpha_colour_assignment[d.id];
        })
        .attr('stroke', function(d) {
            return colour_assignment[d.id];
        })
        .attr("id", function(d) { return d.sc_id; })
        .attr("r", 4)
        .on('mouseover', function(d) {
            return _gtypeMouseover(patient_view, d.id);
        })
        .on('mouseout', function(d) {
            return _gtypeMouseout(patient_view, d.id);
        });

  },

  resize: function(el, width, height, instance) {

  }

});
