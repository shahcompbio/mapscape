#' SpaceSweep 
#'
#' Generates patient clonal SpaceSweeps.
#'
#' @import htmlwidgets
#'
#' @param clonal_prev Clonal prevalence data frame.
#'   Format: columns are (1) {String} "site_id" - id for the anatomic site
#'                       (2) {String} "clone_id" - clone id
#'                       (3) {Number} "clonal_prev" - clonal prevalence.
#' @param tree_edges Tree edges data frame. The root of the tree (id: "Root") must be specified as a source.
#'   Format: columns are (1) {String} "source" - source node id
#'                       (2) {String} "target" - target node id.
#' @param gender Gender of the patient (M/F). 
#' @param clone_colours Data frame with clone ids and their corresponding colours 
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#' @param site_ids {Vector} IDS of the sites in the order your wish to display them 
#'                      (clockwise from positive x-axis & negative y-axis).
#' @param show_root Whether or not to plot the root (for tree).
#' @param n_cells The number of cells to plot (for voronoi tessellation).
#' @export
spacesweep <- function(clonal_prev, 
                      tree_edges,
                      clone_colours,
                      gender,
                      site_ids = "NA",
                      show_root = TRUE,
                      n_cells = 100,
                      width = 960, 
                      height = 960) {

  # CHECK REQUIRED INPUTS ARE PRESENT 

  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided.")
  }
  if (missing(clone_colours)) {
    stop("Clonal colours frame must be provided.")
  }
  if (missing(gender)) {
    stop("The gender of the patient must be provided.")
  }

  # GENDER

  if (gender != "F" && gender != "M") {
    stop("The gender must be specified as \"F\" or \"M\".")
  }

  # CLONAL PREVALENCE DATA

  # ensure column names are correct
  if (!("site_id" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop(paste("Clonal prevalence data frame must have the following column names: ", 
        "\"site_id\", \"clone_id\", \"clonal_prev\"", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$site_id <- as.character(clonal_prev$site_id)
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

  # NUMBER OF CELLS

  if (!is.numeric(n_cells)) {
    stop("The number of cells (n_cells parameter) must be numeric.")  
  }

  # SHOW ROOT
  if (!is.logical(show_root)) {
    stop("The parameter show_root must be a boolean.")  
  }

  # SITE IDS
  site_ids <- as.character(site_ids)
  print(site_ids)


  # forward options using x
  x = list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges),
    clone_cols = jsonlite::toJSON(clone_colours),
    gender = gender,
    site_ids = site_ids,
    n_cells = n_cells,
    show_root = show_root
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
