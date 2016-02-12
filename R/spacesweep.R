#' SpaceSweep 
#'
#' Generates patient clonal SpaceSweeps.
#'
#' @import htmlwidgets
#'
#' @param clonal_prev Clonal prevalence data frame.
#'   Format: columns are (1) {String} "patient_name" - patient name
#'                       (2) {String} "space_id" - id for the anatomic site
#'                       (3) {String} "clone_id" - clone id
#'                       (4) {Number} "clonal_prev" - clonal prevalence.
#'                       (5) (Optional) {Number} "timespan" - time difference between the stated time point and 
#'                                                             the following time point
#' @param tree_edges Tree edges data frame. The root of the tree (id: "Root") must be specified as a source.
#'   Format: columns are (1) {String} "patient_name" - patient name
#'                       (2) {String} "source" - source node id
#'                       (3) {String} "target" - target node id.
#' @export
spacesweep <- function(clonal_prev, 
                      tree_edges,
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
  if (!("patient_name" %in% colnames(clonal_prev)) ||
      !("space_id" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop(paste("Clonal prevalence data frame must have the following column names: ", 
        "\"patient_name\", \"space_id\", \"clone_id\", \"clonal_prev\"", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$patient_name <- as.character(clonal_prev$patient_name)
  clonal_prev$space_id <- as.character(clonal_prev$space_id)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  # TREE EDGES DATA

  # ensure column names are correct
  if (!("patient_name" %in% colnames(tree_edges)) ||
      !("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"patient_name\", \"source\", \"target\"", sep=""))
  }

  # ensure data is of the correct type
  tree_edges$patient_name <- as.character(tree_edges$patient_name)
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # catch if no root is in the tree
  if (!("Root" %in% tree_edges$source)) {
    stop("The root (id: \"Root\") must be specified as a source.")
  }

  # catch if patients are not the same
  if (!setequal(unique(tree_edges$patient_name), unique(clonal_prev$patient_name))) {
    stop(paste("Your tree edge and clonal prevalence data frames contain different patient names. ",
      "Please ensure the patient name is the same.", sep=""))
  }

  patients = unique(tree_edges$patient_name);

  # forward options using x
  x = list(
    patient_ids = patients,
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges)
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
