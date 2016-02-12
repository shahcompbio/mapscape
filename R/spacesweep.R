#' SpaceSweep 
#'
#' Generates patient clonal SpaceSweeps.
#'
#' @import htmlwidgets
#'
#' @param clonal_prev Clonal prevalence data frame.
#'   Format: columns are (1) {String} "space_id" - id for the anatomic site
#'                       (2) {String} "clone_id" - clone id
#'                       (3) {Number} "clonal_prev" - clonal prevalence.
#' @param tree_edges Tree edges data frame. The root of the tree (id: "Root") must be specified as a source.
#'   Format: columns are (1) {String} "source" - source node id
#'                       (2) {String} "target" - target node id.
#' @param clone_colours Data frame with clone ids and their corresponding colours 
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#' @export
spacesweep <- function(clonal_prev, 
                      tree_edges,
                      clone_colours,
                      width = NULL, 
                      height = NULL) {

  # CHECK REQUIRED INPUTS ARE PRESENT 
  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided.")
  }

  # CLONAL PREVALENCE DATA

  # ensure column names are correct
  if (!("space_id" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop(paste("Clonal prevalence data frame must have the following column names: ", 
        "\"space_id\", \"clone_id\", \"clonal_prev\"", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$space_id <- as.character(clonal_prev$space_id)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  # TREE EDGES DATA

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\"", sep=""))
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # catch if no root is in the tree
  if (!("Root" %in% tree_edges$source)) {
    stop("The root (id: \"Root\") must be specified as a source.")
  }

  # NODE COLOURS
  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop(paste("Node colour data frame must have the following column names: ", 
          "\"clone_id\", \"colour\"", sep=""))
    }
  }

  # forward options using x
  x = list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges),
    clone_cols = jsonlite::toJSON(clone_colours)
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'spacesweep',
    x,
    width = width,
    height = height,
    package = 'spacesweep'
  )
}

#' Widget output function for use in Shiny
#'
#' @export
spacesweepOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'spacesweep', width, height, package = 'spacesweep')
}

#' Widget render function for use in Shiny
#'
#' @export
renderSpacesweep <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, spacesweepOutput, env, quoted = TRUE)
}
