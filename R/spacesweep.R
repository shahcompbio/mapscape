#' SpaceSweep 
#'
#' Generates patient clonal SpaceSweeps.
#'
#' Interactive components in main view:
#'
#' 1. reorder samples by grabbing the sample name and dragging it around the circle. \cr
#' 2. hover over tumour sample of interest to view patient data associated with that sample. \cr
#' 3. hover over sample tree nodes to view cellular prevalence. 
#'
#' Interactive components in legend:
#'
#' 1. hover over legend tree node to view tumour samples expressing the genotype. \cr
#' 2. hover over legend tree branch to view tumour samples  expressing all descendant genotypes. \cr
#' 3. click on legend tree nodes to view (a) updated mutations table showing new mutations at that clone, and (b) tumour samples expressing the new mutations at that clone. \cr
#' 4. hover over mixture classification to view corresponding tumour sample, and the participating branches in each tumour sample. 
#'
#' Interactive components in mutation table:
#'
#' 1. search for any mutation, coordinate, gene, etc. \cr
#' 2. click on a row in the table, and the view will update to show the tumour samples with that mutation, and the mutation prevalence in each tumour sample. \cr
#' 3. order the table by a column (all columns sortable except the Clone column). 
#'
#' Note: Click on the view background to exit a selection.
#'
#'
#' @import htmlwidgets
#'
#' @param clonal_prev {Data Frame} Clonal prevalence.
#'   Format: columns are (1) {String} "sample_id" - id for the tumour sample
#'                       (2) {String} "clone_id" - clone id
#'                       (3) {Number} "clonal_prev" - clonal prevalence.
#' @param tree_edges {Data Frame} Tree edges. 
#'   Format: columns are (1) {String} "source" - source clone id
#'                       (2) {String} "target" - target clone id.
#' @param tree_root {String} The clone id for the root of the tree.
#' @param sample_locations {Data Frame} Anatomic locations for each tumour sample.
#'   Format: columns are (1) {String} "sample_id" - id for the tumour sample
#'                       (2) {String} "location_id" - name of anatomic location for this tumour sample
#'                       (3) {Number} (Optional) "x" - x-coordinate (in pixels) for anatomic location on anatomic image
#'                       (4) {Number} (Optional) "y" - y-coordinate (in pixels) for anatomic location on anatomic image
#' @param mutations {Data Frame} (Optional) Mutations occurring at each clone.
#'   Format: columns are (1) {String} "chrom" - chromosome number
#'                       (2) {Number} "coord" - coordinate of mutation on chromosome
#'                       (3) {String} "clone_id" - clone id
#'                       (4) {String} "sample_id" - id for the tumour sample 
#'                       (5) {Number} "VAF" - variant allele frequency of the mutation in the corresponding sample
#'                       (6) {String} (Optional) "gene_name" - name of the affected gene (can be "" if none affected).
#'                       (7) {String} (Optional) "effect" - effect of the mutation 
#'                                                          (e.g. non-synonymous, upstream, etc.)
#'                       (8) {String} (Optional) "impact" - impact of the mutation (e.g. low, moderate, high).
#' @param gender {String} Gender of the patient (M/F). 
#' @param clone_colours {Data Frame} (Optional) Clone ids and their corresponding colours (in hex format)
#'   Format: columns are (1) {String} "clone_id" - the clone ids
#'                       (2) {String} "colour" - the corresponding Hex colour for each clone id.
#' @param sample_ids {Vector} (Optional) Ids of the samples in the order your wish to display them 
#'                      (clockwise from positive x-axis).
#' @param n_cells {Number} (Optional) The number of cells to plot (for voronoi tessellation).
#' @param img_ref {String} (Optional) A reference for the custom anatomical image to use, 
#'                                    either a URL to an image hosted online 
#'                                    or a path to the image in local file system. 
#'                                    If unspecified, will use default generic male and female images.
#' @export
spacesweep <- function(clonal_prev, 
                      tree_edges,
                      tree_root,
                      sample_locations,
                      clone_colours = "NA",
                      mutations = "NA",
                      gender,
                      sample_ids = "NA",
                      n_cells = 100,
                      img_ref = "NA",
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
    stop("Clonal prevalence data frame must be provided (parameter \"clonal_prev\").")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided (parameter \"tree_edges\").")
  }
  if (missing(tree_root)) {
    stop("Tree root clone id must be provided (parameter \"tree_root\").")
  }
  if (missing(gender)) {
    stop("The gender of the patient must be provided (parameter \"gender\").")
  }
  if (missing(sample_locations)) {
    stop("The locations of the tumour samples must be provided (parameter \"sample_locations\").")
  }

  # TREE EDGES DATA

  print("[Progress] Processing tree edges data...")

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop(paste("Tree edges data frame must have the following column names: ", 
        "\"source\", \"target\".", sep=""))
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # get list of clones in the phylogeny
  clones_in_phylo <- unique(c(tree_edges$source, tree_edges$target))

  # GENDER

  if (gender != "F" && gender != "M") {
    stop("The gender must be specified as \"F\" or \"M\".")
  }

  # CLONAL PREVALENCE DATA

  print("[Progress] Processing clonal prevalence data...")

  # ensure column names are correct
  if (!("sample_id" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop(paste("Clonal prevalence data frame must have the following column names: ", 
        "\"sample_id\", \"clone_id\", \"clonal_prev\".", sep=""))
  }

  # ensure data is of the correct type
  clonal_prev$sample_id <- as.character(clonal_prev$sample_id)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))

  # SAMPLE LOCATIONS DATA

  print("[Progress] Processing sample locations data...")

  # ensure column names are correct
  if (!("sample_id" %in% colnames(sample_locations)) ||
      !("location_id" %in% colnames(sample_locations))) {
    stop(paste("Sample locations data frame must have the following column names: ", 
        "\"sample_id\", \"location_id\".", sep=""))
  }

  # ensure data is of the correct type
  sample_locations$sample_id <- as.character(sample_locations$sample_id)
  sample_locations$location_id <- as.character(sample_locations$location_id)

  # if custom image reference provided, but no location coordinates are provided, throw error
  if ((img_ref != "NA") &&
    !(("x" %in% colnames(sample_locations)) && ("y" %in% colnames(sample_locations)))) {
    stop(paste("When providing a custom image, you must specify coordinates (\"x\" and \"y\" columns) ",
      "for each sample in the sample_locations data frame.", sep=""))
  }

  # check if location coordinates are provided
  if (("x" %in% colnames(sample_locations)) && ("y" %in% colnames(sample_locations))) {
    location_coordinates_provided <- TRUE
    print("[Progress] Custom sample location coordinates provided...")

    # ensure coordinates are numeric
    sample_locations$x <- as.numeric(as.character(sample_locations$x))
    sample_locations$y <- as.numeric(as.character(sample_locations$y))
  }
  else {
    location_coordinates_provided <- FALSE
    print("[Progress] No custom sample location coordinates provided; defaults will be used where possible...")
  }

  # check that all samples in the clonal prevalence data are present in the sample locations data
  clonal_prev_sample_ids <- unique(clonal_prev$sample_id)
  sample_locations_sample_ids <- unique(sample_locations$sample_id)
  samples_missing_from_locations_data <- setdiff(clonal_prev_sample_ids, sample_locations_sample_ids)
  if (length(samples_missing_from_locations_data) > 0) {
    stop(paste("All samples in the clonal prevalence data must have associated locations. The following sample(s) must be added ",
      "to the sample locations data frame: ", paste(samples_missing_from_locations_data, collapse=", "), ".", sep=""))
  }

  # MUTATIONS DATA

  if (is.data.frame(mutations)) {
    print("[Progress] Processing mutations data...")

    # ensure column names are correct
    if (!("chrom" %in% colnames(mutations)) ||
        !("coord" %in% colnames(mutations)) ||
        !("clone_id" %in% colnames(mutations)) ||
        !("sample_id" %in% colnames(mutations)) ||
        !("VAF" %in% colnames(mutations))) {
      stop(paste("Mutations data frame must have the following column names: ", 
          "\"chrom\", \"coord\", \"clone_id\", \"sample_id\", \"VAF\"..", sep=""))
    }

    # ensure data is of the correct type
    mutations$chrom <- toupper(as.character(mutations$chrom)) # upper case X & Y
    mutations$coord <- as.character(mutations$coord)
    mutations$clone_id <- as.character(mutations$clone_id)
    mutations$sample_id <- as.character(mutations$sample_id)
    mutations$VAF <- as.numeric(as.character(mutations$VAF))

    # check for optional info, and ensure data of correct type
    if ("gene_name" %in% colnames(mutations)) {
      mutations$gene_name <- as.character(mutations$gene_name)
    }
    if ("effect" %in% colnames(mutations)) {
      mutations$effect <- as.character(mutations$effect)
    }
    if ("impact" %in% colnames(mutations)) {
      mutations$impact <- as.character(mutations$impact)
    }

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

    # keep only those mutations whose clone ids are present in the phylogeny
    mutations <- mutations[which(mutations$clone_id %in% clones_in_phylo),]


    # MUTATION PREVALENCES DATA

    mutation_prevalences <- mutations

    print("[Progress] Processing mutation prevalences data...")

    # keep only those mutations whose clone ids are present in the phylogeny
    mutation_prevalences <- mutation_prevalences[which(mutation_prevalences$clone_id %in% clones_in_phylo),]

    # compress results
    mutation_prevalences$location <- apply(mutation_prevalences[, c("chrom","coord")], 1 , paste, collapse = ":")
    prevs_split <- split(mutation_prevalences, f = mutation_prevalences$location)

    # reduce the size of the data frame in each list
    prevs_split_small <- lapply(prevs_split, function(prevs) {
      return(prevs[,c("sample_id", "VAF")])
    })


    # MUTATION INFO 
    mutation_info <- unique(mutations[,c("chrom","coord","clone_id")])

  }
  else {
    prevs_split_small <- "NA"
  }

  # NODE COLOURS
  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop(paste("Node colour data frame must have the following column names: ", 
          "\"clone_id\", \"colour\".", sep=""))
    }  

    # convert to character
    clone_colours$colour <- as.character(clone_colours$colour)
    clone_colours$clone_id <- as.character(clone_colours$clone_id)

    # ensure node colours are specified in HEX
    for (i in 1:length(clone_colours$colour)) {
      if (!(nchar(clone_colours$colour[i]) %in% c(6,7))) {
        stop(paste("All colours must be specified in HEX. \"", clone_colours$colour[i], 
          "\" is not a HEX colour.", sep=""))
      }
    }

    # ensure all tree nodes have associated colours
    tree_clone_ids <- unique(unlist(tree_edges))
    colour_clone_ids <- clone_colours$clone_id
    clone_ids_not_in_colour_data <- setdiff(tree_clone_ids, colour_clone_ids) # clone ids that are in the tree df but not colour df
    if (length(clone_ids_not_in_colour_data) > 0) {
      stop(paste("All clones in the tree must have associated colours. The following clone(s) must be added ",
        "to the clone colour data frame: ", paste(clone_ids_not_in_colour_data, collapse=", "), ".", sep=""))
    }
  }

  # NUMBER OF CELLS

  if (!is.numeric(n_cells)) {
    stop("The number of cells (n_cells parameter) must be numeric.")  
  }

  # SAMPLE IDS
  sample_ids <- as.character(sample_ids)

  # if sample id array provided
  if (sample_ids != "NA") {
    # check that all sample ids are present in the clonal prevalence data
    clonal_prev_sample_ids <- unique(clonal_prev$sample_id)
    sample_ids_unique <- unique(sample_ids)
    sample_ids_to_remove <- setdiff(sample_ids_unique, clonal_prev_sample_ids) # clone ids that are in the sample list but not clonal prevalence data
    if (length(sample_ids_to_remove) > 0) {
      stop(paste("All sample ids in the sample_ids array must have clonal prevalence data. ",
        "The following samples do not have associated clonal prevalence data: ", 
        paste(sample_ids_to_remove, collapse=", "), ". ", sep=""))
    }
  }

  # forward options using x
  x = list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges),
    tree_root = tree_root,
    sample_locations = jsonlite::toJSON(sample_locations),
    location_coordinates_provided = location_coordinates_provided,
    clone_cols = jsonlite::toJSON(clone_colours),
    mutations = jsonlite::toJSON(mutation_info),
    mutation_prevalences = jsonlite::toJSON(prevs_split_small),
    gender = gender,
    sample_ids = sample_ids,
    n_cells = n_cells,
    img_ref = img_ref
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
