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
#' @param mutations (Optional) Data frame of mutations occurring before the appearance of each clone.
#'   Format: columns are (1) {String} "chrom" - chromosome number
#'                       (2) {Number} "coord" - coordinate of mutation on chromosome
#'                       (3) {String} "clone_id" - clone id
#'                       (4) {String} "gene_name" - name of the affected gene (can be "" if none affected).
#' @param mutation_prevalences (Optional) Data frame of mutation prevalences for each anatomic site in a patient.
#'   Format: columns are (1) {String} "chrom" - chromosome number
#'                       (2) {Number} "coord" - coordinate of mutation on chromosome
#'                       (3) {String} "site_id" - anatomic site id
#'                       (4) {Number} "prev" - prevalence of the mutation.
#' @param gender Gender of the patient (M/F). 
#' @param clone_colours (Optional) Data frame with clone ids and their corresponding colours 
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#' @param site_ids {Vector} (Optional) Ids of the sites in the order your wish to display them 
#'                      (clockwise from positive x-axis).
#' @param show_root (Optional) Whether or not to plot the root (for tree).
#' @param n_cells (Optional) The number of cells to plot (for voronoi tessellation).
#' @export
spacesweep <- function(clonal_prev, 
                      tree_edges,
                      clone_colours = "NA",
                      mutations = "NA",
                      mutation_prevalences = "NA",
                      gender,
                      site_ids = "NA",
                      show_root = FALSE,
                      n_cells = 100,
                      width = 960, 
                      height = 960) {


  # ENSURE MINIMUM DIMENSIONS SATISFIED
  min_height = 800
  min_width = 930
  if (height < min_height) {
    stop(paste("Height must be greater than or equal to ", min_height, "px.", sep=""))
  }
  if (width < min_width) {
    stop(paste("Width must be greater than or equal to ", min_width, "px.", sep=""))
  }

  # CHECK REQUIRED INPUTS ARE PRESENT 

  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided.")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided.")
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
        "\"site_id\", \"clone_id\", \"clonal_prev\".", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$site_id <- as.character(clonal_prev$site_id)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  # MUTATIONS DATA

  if (is.data.frame(mutations)) {
    # ensure column names are correct
    if (!("chrom" %in% colnames(mutations)) ||
        !("coord" %in% colnames(mutations)) ||
        !("clone_id" %in% colnames(mutations)) ||
        !("gene_name" %in% colnames(mutations))) {
      stop(paste("Mutations data frame must have the following column names: ", 
          "\"chrom\", \"coord\", \"clone_id\", \"gene_name\".", sep=""))
    }

    # ensure data is of the correct type
    mutations$chrom <- toupper(as.character(mutations$chrom)) # upper case X & Y
    mutations$coord <- as.character(mutations$coord)
    mutations$clone_id <- as.character(mutations$clone_id)
    mutations$gene_name <- as.character(mutations$gene_name)

    # create a location column, combining the chromosome and the coordinate
    mutations$location <- apply(mutations[, c("chrom","coord")], 1 , paste, collapse = ":")

    # coordinate is now a number
    mutations$coord <- as.numeric(as.character(mutations$coord))

    # check X & Y chromosomes are labelled "X" and "Y", not "23", "24"
    num_23 <- mutations[which(mutations$chrom == "23"),]
    if (nrow(num_23) > 0) {
      stop(paste("Chromosome numbered \"23\" was detected in mutations data frame - X and Y chromosomes ",
        "must be labelled \"X\" and \"Y\".", sep=""))
    }
  }

  # MUTATION PREVALENCES DATA

  if (is.data.frame(mutation_prevalences)) {
    # ensure column names are correct
    if (!("chrom" %in% colnames(mutation_prevalences)) ||
        !("coord" %in% colnames(mutation_prevalences)) ||
        !("site_id" %in% colnames(mutation_prevalences)) ||
        !("prev" %in% colnames(mutation_prevalences))) {
      stop(paste("Mutation prevalences data frame must have the following column names: ", 
          "\"chrom\", \"coord\", \"site_id\", \"prev\".", sep=""))
    }

    # ensure data is of the correct type
    mutation_prevalences$chrom <- toupper(as.character(mutation_prevalences$chrom)) # upper case X & Y
    mutation_prevalences$coord <- as.character(mutation_prevalences$coord)
    mutation_prevalences$site_id <- as.character(mutation_prevalences$site_id)
    mutation_prevalences$prev <- as.numeric(as.character(mutation_prevalences$prev))

    # check X & Y chromosomes are labelled "X" and "Y", not "23", "24"
    num_23 <- mutation_prevalences[which(mutation_prevalences$chrom == "23"),]
    if (nrow(num_23) > 0) {
      stop(paste("Chromosome numbered \"23\" was detected in mutation prevalences data frame - X and Y chromosomes ",
        "must be labelled \"X\" and \"Y\".", sep=""))
    }

    # compress results
    mutation_prevalences$location <- apply(mutation_prevalences[, c("chrom","coord")], 1 , paste, collapse = ":")
    prevs_split <- split(mutation_prevalences, f = mutation_prevalences$location)

    # reduce the size of the data frame in each list
    prevs_split_small <- lapply(prevs_split, function(prevs) {
      return(prevs[,c("site_id", "prev")])
    })
  }

  # TREE EDGES DATA

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\".", sep=""))
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
          "\"clone_id\", \"colour\".", sep=""))
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


  # forward options using x
  x = list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges),
    clone_cols = jsonlite::toJSON(clone_colours),
    mutations = jsonlite::toJSON(mutations),
    mutation_prevalences = jsonlite::toJSON(prevs_split_small),
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
