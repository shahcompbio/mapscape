#' MapScape 
#'
#' Generates patient clonal MapScapes.
#'
#' Interactive components in main view:
#'   \enumerate{
#' 
#'     \item Reorder samples by grabbing the sample name or tumour and 
#'        dragging it radially.
#' 
#'     \item Hover over anatomic location of interest to view the 
#'        anatomic location name and the patient data associated with 
#'        that location.
#' 
#'     \item Hover over a tree node of a particular sample to view 
#'        cellular prevalence of that clone in that particular sample. 
#'
#'   }
#'
#' Interactive components in legend:
#'   \enumerate{
#' 
#'     \item Hover over legend tree node to view the clone ID as well 
#'        as the clone's prevalence at each tumour sample. Any anatomic 
#'        locations expressing that clone will be highlighted.
#' 
#'     \item Hover over legend tree branch to view tumour samples 
#'        expressing all descendant clones.
#' 
#'     \item Click on legend tree node(s) to view (a) updated mutations 
#'        table showing novel mutations at that clone(s), and (b) tumour 
#'        samples expressing the novel mutations at that clone(s).
#' 
#'     \item Hover over a mixture class (e.g. "pure", "polyphyletic", 
#'        "monophyletic") to view corresponding tumour samples, and the 
#'        participating phylogeny in each tumour sample. 
#'
#'   }
#'
#' Interactive components in mutation table:
#'   \enumerate{
#' 
#'     \item Search for any chromosome, coordinate, gene, etc.
#' 
#'     \item Click on a row in the table, and the view will update to show 
#'         the tumour samples with that mutation, and the variant 
#'         allele frequency for that mutation in each tumour sample.
#' 
#'     \item Sort the table by a column (all columns sortable except 
#'         the Clone column). 
#'
#'   }
#'
#' Note: Click on the reset button to exit a selection. Click the download 
#'     buttons to download a PNG or SVG of the view. \cr
#'
#'
#' @import htmlwidgets
#'
#' @param clonal_prev \code{data.frame} Clonal prevalence. 
#'     Required columns are:
#'     \describe{
#'
#'       \item{sample_id:}{\code{character()} id for the tumour sample.}
#' 
#'       \item{clone_id:}{\code{character()} clone id.}
#' 
#'       \item{clonal_prev:}{\code{numeric()} clonal prevalence.}
#'
#'     }
#' @param tree_edges \code{data.frame} Tree edges of a rooted tree. 
#'     Required columns are:
#'     \describe{
#'
#'       \item{source:}{\code{character()} source node id.}
#' 
#'       \item{target:}{\code{character()} target node id.}
#'
#'     }
#' @param sample_locations \code{data.frame} Anatomic locations for 
#'     each tumour sample. Required columns are:
#'     \describe{
#'
#'       \item{sample_id:}{\code{character()} id for the tumour 
#'          sample.}
#' 
#'       \item{location_id:}{\code{character()} name of anatomic 
#'          location for this tumour sample.}
#'
#'       \item{x:}{\code{numeric()} x-coordinate (in pixels) for 
#'          anatomic location on anatomic image.}
#' 
#'       \item{y:}{\code{numeric()} y-coordinate (in pixels) for 
#'          anatomic location on anatomic image.}
#'
#'     }
#' @param img_ref \code{character()} A reference for the custom 
#'     anatomical image to use, *** in PNG format ***, either a URL 
#'     to an image hosted online or a path to the image in local 
#'     file system. 
#' @param mutations \code{data.frame} (Optional) Mutations occurring 
#'     at each clone. Any additional field will be shown in the 
#'     mutation table. Required columns are:
#'     \describe{
#'
#'       \item{chrom:}{\code{character()} chromosome number.}
#' 
#'       \item{coord:}{\code{numeric()} coordinate of mutation on 
#'          chromosome.}
#'
#'       \item{clone_id:}{\code{character()} clone id.}
#' 
#'       \item{sample_id:}{\code{character()} id for the tumour sample.}
#'
#'       \item{VAF:}{\code{numeric()} ariant allele frequency of the 
#'          mutation in the corresponding sample.}
#'
#'     }
#' @param clone_colours \code{data.frame} (Optional) Clone ids and their 
#'     corresponding colours (in hex format). Required columns are:
#'     \describe{
#'
#'       \item{clone_id:}{\code{character()} clone id.}
#' 
#'       \item{colour:}{\code{character()} the corresponding Hex colour 
#'          for each clone id.}
#'
#'     }
#' @param sample_ids \code{vector} (Optional) Ids of the samples in the 
#'     order your wish to display them (clockwise from positive x-axis).
#' @param n_cells \code{numeric()} (Optional) The number of cells to 
#'     plot (for voronoi tessellation).
#' @param show_low_prev_gtypes \code{logical()} (Optional) Whether or 
#'     not to show low-prevalence (< 0.01) clones in the view. Default 
#'     is FALSE.
#' @param phylogeny_title \code{character()} (Optional) Legend title 
#'     for the phylogeny. Default is "Clonal Phylogeny".
#' @param anatomy_title \code{character()} (Optional) Legend title for 
#'     the anatomy. Default is "Anatomy".
#' @param classification_title \code{character()} (Optional) Legend title 
#'     for the phylogenetic classification. Default is "Phylogenetic 
#'     Classification".
#' @param show_warnings \code{logical()} (Optional) Whether or not to 
#'     show any warnings. Default is TRUE.
#' @param width \code{numeric()} (Optional) Width of the plot. Minimum 
#'     width is 930.
#' @param height \code{numeric()} (Optional) Height of the plot. Minimum 
#'     height is 700.
#' @export
#' @examples
#'
#' library("mapscape")
#'
#' # EXAMPLE 1 - Patient A21, Gundem et al., 2015
#'
#' # clonal prevalences
#' clonal_prev <- read.csv(system.file("extdata", "A21_clonal_prev.csv", 
#'     package = "mapscape"))
#'
#' # mutations
#' mutations <- read.csv(system.file("extdata", "A21_mutations.csv", 
#'     package = "mapscape"))
#'
#' # locations of each tumour sample on user-provided image
#' sample_locations <- read.csv(system.file("extdata", 
#'     "A21_sample_locations.csv", package = "mapscape"))
#'
#' # genotype tree edges
#' tree_edges <- read.csv(system.file("extdata", "A21_tree.csv", package 
#'     = "mapscape"))
#'
#' # image reference
#' img_ref <- system.file("extdata", "A21_anatomical_image.png", package 
#'     = "mapscape")
#'
#' # radial order of samples
#' sample_ids <- c("H","F","J","D","A","I","C","E","G")
#'
#' # run mapscape
#' mapscape(clonal_prev = clonal_prev, tree_edges = tree_edges, 
#'     sample_locations = sample_locations, mutations = mutations, 
#' img_ref = img_ref, sample_ids = sample_ids)
#'
#' # EXAMPLE 2 - Patient 1, McPherson and Roth et al., 2016
#'
#' # clonal prevalences
#' clonal_prev <- read.csv(system.file("extdata", "px1_clonal_prev.csv", 
#'     package = "mapscape"))
#'
#' # mutations
#' mutations <- read.csv(system.file("extdata", "px1_mutations.csv", 
#'     package = "mapscape"))
#'
#' # locations of each tumour sample on user-provided image
#' sample_locations <- read.csv(system.file("extdata", 
#'     "px1_sample_locations.csv", package = "mapscape"))
#'
#' # genotype tree edges
#' tree_edges <- read.csv(system.file("extdata", "px1_tree.csv", 
#'     package = "mapscape"))
#'
#' # image reference
#' img_ref <- system.file("extdata", "px1_anatomical_image.png", 
#'     package = "mapscape")
#'
#' # colours for each clone
#' clone_colours <- data.frame( 
#'     clone_id = c("A","B","C","D","E","F","G","H","I"), 
#'     colour = c("d0ced0", "2CD0AB", "7FE9D1", "FFD94B", "FD8EE5", 
#'     "F8766D", "4FD8FF", "B09AF5", "D4C7FC"))
#'
#' # radial order of samples
#' sample_ids <- c("LFTB4", "LOvB2", "ApC1", "ROvA4", "ROv4", "ROv3", 
#'     "ROv2", "ROv1", "RFTA16", "Om1", "SBwl", "SBwlE4")
#'
#' # run mapscape
#' mapscape(clonal_prev = clonal_prev, tree_edges = tree_edges, 
#'     sample_locations = sample_locations, mutations = mutations, 
#'     img_ref = img_ref, clone_colours = clone_colours, 
#'     sample_ids = sample_ids)
#'
#' # EXAMPLE 3 - Patient 7, McPherson and Roth et al., 2016
#'
#' # clonal prevalences
#' clonal_prev <- read.csv(system.file("extdata", "px7_clonal_prev.csv", 
#'     package = "mapscape"))
#'
#' # mutations
#' mutations <- read.csv(system.file("extdata", "px7_mutations.csv", 
#'     package = "mapscape"))
#'
#' # locations of each tumour sample on user-provided image
#' sample_locations <- read.csv(system.file("extdata", 
#'     "px7_sample_locations.csv", package = "mapscape"))
#'
#' # genotype tree edges
#' tree_edges <- read.csv(system.file("extdata", "px7_tree.csv", 
#'     package = "mapscape"))
#'
#' # image reference
#' img_ref <- system.file("extdata", "px7_anatomical_image.png", 
#'     package = "mapscape")
#'
#' # colours for each clone
#' clone_colours <- data.frame(clone_id = c("A","B","C","D","E"), 
#'                             colour = c("d0ced0", "2CD0AB", "FFD94B", 
#'     "FD8EE5", "F8766D"))
#'
#' # radial order of samples
#' sample_ids <- c("BwlA6", "RPvM", "RUtD1", "RUtD2", "RUtD3", "ROvC4", 
#'     "ROvC5", "ROvC6", "LOv1","LOvA10","LOvA4","BrnM", "BrnMA1")
#'
#' # run mapscape
#' mapscape(clonal_prev = clonal_prev, tree_edges = tree_edges, 
#'     sample_locations = sample_locations, mutations = mutations, 
#'     img_ref = img_ref, clone_colours = clone_colours, sample_ids = sample_ids)
mapscape <- function(clonal_prev, 
                      tree_edges,
                      sample_locations,
                      img_ref,
                      clone_colours = "NA",
                      mutations = "NA",
                      sample_ids = c("NA"),
                      n_cells = 100,
                      show_low_prev_gtypes = FALSE,
                      phylogeny_title = "Clonal Phylogeny",
                      anatomy_title = "Anatomy",
                      classification_title = "Phylogenetic Classification",
                      show_warnings = TRUE,
                      width = 960, 
                      height = 960) {


  # ENSURE MINIMUM DIMENSIONS SATISFIED
  min_height = 700
  min_width = 930
  if (height < min_height) {
    stop("Height must be greater than or equal to ", min_height, "px.")
  }
  if (width < min_width) {
    stop("Width must be greater than or equal to ", min_width, "px.")
  }

  # CHECK REQUIRED INPUTS ARE PRESENT 

  if (missing(clonal_prev)) {
    stop("Clonal prevalence data frame must be provided (parameter \"clonal_prev\").")
  }
  if (missing(tree_edges)) {
    stop("Tree edge data frame must be provided (parameter \"tree_edges\").")
  }
  if (missing(sample_locations)) {
    stop("The locations of the tumour samples must be provided (parameter \"sample_locations\").")
  }
  if (missing(img_ref)) {
    stop("The anatomical image reference must be provided (parameter \"img_ref\").")
  }

  # IMAGE 

  # check image is png
  if (!grepl('.png', img_ref)) {
    stop("The anatomical image must be in PNG format (must end in \".png\").")
  }

  img_ref_base64 <- base64enc::base64encode(img_ref)

  # TREE EDGES DATA

  # print("[Progress] Processing tree edges data...")

  # ensure there is data within it
  if (nrow(tree_edges) == 0) {
    stop("Tree edges data frame contains no data.")
  }

  # ensure column names are correct
  if (!("source" %in% colnames(tree_edges)) ||
      !("target" %in% colnames(tree_edges))) {
    stop("Tree edges data frame must contain the following column names: ", 
        "\"source\", \"target\".")
  }

  # ensure data is of the correct type
  tree_edges$source <- as.character(tree_edges$source)
  tree_edges$target <- as.character(tree_edges$target)

  # get list of clones in the phylogeny
  clones_in_phylo <- unique(c(tree_edges$source, tree_edges$target))

  # check for tree rootedness
  sources <- unique(tree_edges$source)
  targets <- unique(tree_edges$target)
  sources_for_iteration <- sources # because we will be changing the sources array over time
  for (i in 1:length(sources_for_iteration)) {
    cur_source <- sources_for_iteration[i]

    # if the source is a target, remove it from the sources list
    if (cur_source %in% targets) {
      sources <- sources[sources != cur_source]
    }
  }

  # if multiple roots are detected, throw error
  if (length(sources) > 1) {
    stop(paste("Multiple roots detected in tree (",paste(sources,collapse=", "),
      ") - tree must have only one root.",sep=""))
  }

  # CLONAL PREVALENCE DATA

  # print("[Progress] Processing clonal prevalence data...")

  # create map of original sample ids to space-replaced sample ids
  sample_id_map <- data.frame(original_sample_id = unique(clonal_prev$sample_id), stringsAsFactors=FALSE)
  sample_id_map$space_replaced_sample_id <- stringr::str_replace_all(sample_id_map$original_sample_id,"\\s+","_")

  # create map of original clone ids to space-replaced clone ids
  clone_id_map <- data.frame(original_clone_id = unique(c(tree_edges$source, tree_edges$target)), stringsAsFactors=FALSE)
  clone_id_map$space_replaced_clone_id <- stringr::str_replace_all(clone_id_map$original_clone_id,"\\s+","_")

  # ensure there is data within it
  if (nrow(clonal_prev) == 0) {
    stop("Clonal prevalence data frame contains no data.")
  }

  # ensure column names are correct
  if (!("sample_id" %in% colnames(clonal_prev)) ||
      !("clone_id" %in% colnames(clonal_prev)) ||
      !("clonal_prev" %in% colnames(clonal_prev))) {
    stop("Clonal prevalence data frame must contain the following column names: ", 
        "\"sample_id\", \"clone_id\", \"clonal_prev\".")
  }

  # ensure data is of the correct type
  clonal_prev$sample_id <- as.character(clonal_prev$sample_id)
  clonal_prev$clone_id <- as.character(clonal_prev$clone_id)
  clonal_prev$clonal_prev <- as.numeric(as.character(clonal_prev$clonal_prev))


  # ensure all clone ids in clonal prevalence data have associated nodes in the tree
  tree_clone_ids <- unique(unlist(tree_edges))
  clonal_prev_clone_ids <- unique(clonal_prev$clone_id)
  clone_ids_not_in_tree_data <- setdiff(clonal_prev_clone_ids, tree_clone_ids) 
  if (length(clone_ids_not_in_tree_data) > 0) {
    stop("All clone IDs in the clonal prevalence data must have associated tree nodes. ",
      "The following clone ID(s) are present in the clonal prevalences data, but not in the tree edges data: ",
      paste(clone_ids_not_in_tree_data, collapse=", "), ".")
  }

  # SAMPLE LOCATIONS DATA

  # print("[Progress] Processing sample locations data...")

  # ensure there is data within it
  if (nrow(sample_locations) == 0) {
    stop("Sample locations data frame contains no data.")
  }

  # ensure column names are correct
  if (!("sample_id" %in% colnames(sample_locations)) ||
      !("location_id" %in% colnames(sample_locations)) ||
      !("x" %in% colnames(sample_locations)) ||
      !("y" %in% colnames(sample_locations))) {
    stop("Sample locations data frame must contain the following column names: ", 
        "\"sample_id\", \"location_id\", \"x\", \"y\".")
  }

  # ensure data is of the correct type
  sample_locations$sample_id <- as.character(sample_locations$sample_id)
  sample_locations$location_id <- as.character(sample_locations$location_id)
  sample_locations$x <- as.numeric(as.character(sample_locations$x))
  sample_locations$y <- as.numeric(as.character(sample_locations$y))

  # check that all samples in the clonal prevalence data are present in the sample locations data
  clonal_prev_sample_ids <- unique(clonal_prev$sample_id)
  sample_locations_sample_ids <- unique(sample_locations$sample_id)
  samples_missing_from_locations_data <- setdiff(clonal_prev_sample_ids, sample_locations_sample_ids)
  if (length(samples_missing_from_locations_data) > 0) {
    stop("All samples in the clonal prevalence data must have associated locations. The following sample(s) must be added ",
      "to the sample locations data frame: ", paste(samples_missing_from_locations_data, collapse=", "), ".")
  }

  # create map of original sample locations to space-replaced sample locations
  sample_loc_map <- data.frame(original_sample_loc = unique(sample_locations$location_id), stringsAsFactors=FALSE)
  sample_loc_map$space_replaced_sample_loc <- stringr::str_replace_all(sample_loc_map$original_sample_loc,"\\s+","_")

  # MUTATIONS DATA

  if (is.data.frame(mutations)) {
    # print("[Progress] Processing mutations data...")

    # ensure there is data within it
    if (nrow(mutations) == 0) {
      stop("Mutations data frame contains no data.")
    }

    # ensure column names are correct
    if (!("chrom" %in% colnames(mutations)) ||
        !("coord" %in% colnames(mutations)) ||
        !("clone_id" %in% colnames(mutations)) ||
        !("sample_id" %in% colnames(mutations)) ||
        !("VAF" %in% colnames(mutations))) {
      stop("Mutations data frame must contain the following column names: ", 
          "\"chrom\", \"coord\", \"clone_id\", \"sample_id\", \"VAF\".")
    }

    # ensure data is of the correct type
    mutations$chrom <- toupper(as.character(mutations$chrom)) # upper case X & Y
    mutations$coord <- as.character(mutations$coord)
    mutations$clone_id <- as.character(mutations$clone_id)
    mutations$sample_id <- as.character(mutations$sample_id)
    mutations$VAF <- as.numeric(as.character(mutations$VAF))

    # check for optional info, and ensure data of correct type
    extra_columns <- colnames(mutations)[which(!(colnames(mutations) %in% c("chrom", "coord", "clone_id", "sample_id", "VAF")))]

    # check that all SAMPLES in the mutations data are present in the sample locations & clonal prev data
    mutations_sample_ids <- unique(mutations$sample_id)
    sample_locations_sample_ids <- unique(sample_locations$sample_id)
    clonal_prev_sample_ids <- unique(clonal_prev$sample_id)
    samples_missing_from_locations_data <- setdiff(mutations_sample_ids, sample_locations_sample_ids)
    samples_missing_from_clonal_prev_data <- setdiff(mutations_sample_ids, clonal_prev_sample_ids)
    if (length(samples_missing_from_locations_data) > 0) {
      stop("The following sample(s) are present in the mutations data but ",
        "are missing from the sample locations data: ",
        paste(samples_missing_from_locations_data, collapse=", "), ".")
    }
    if (length(samples_missing_from_clonal_prev_data) > 0) {
      stop("The following sample(s) are present in the mutations data but ",
        "are missing from the clonal prevalence data: ",
        paste(samples_missing_from_clonal_prev_data, collapse=", "), ".")
    }

    # check that all CLONE IDS in the mutations data are present in the tree data
    mutations_clone_ids <- unique(mutations$clone_id)
    tree_edges_clone_ids <- c(unique(tree_edges$source), unique(tree_edges$target))
    clone_ids_missing_from_tree_edges_data <- setdiff(mutations_clone_ids, tree_edges_clone_ids)
    if (length(clone_ids_missing_from_tree_edges_data) > 0) {
      stop("The following clone ID(s) are present in the mutations data but ",
        "are missing from the tree edges data: ",
        paste(clone_ids_missing_from_tree_edges_data, collapse=", "), ".")
    }

    # create a location column, combining the chromosome and the coordinate
    mutations$location <- apply(mutations[, c("chrom","coord")], 1 , paste, collapse = ":")

    # coordinate is now a number
    mutations$coord <- as.numeric(as.character(mutations$coord))

    # check X & Y chromosomes are labelled "X" and "Y", not "23", "24"
    num_23 <- mutations[which(mutations$chrom == "23"),]
    if (nrow(num_23) > 0) {
      stop("Chromosome numbered \"23\" was detected in mutations data frame - X and Y chromosomes ",
        "must be labelled \"X\" and \"Y\".")
    }

    # keep only those mutations whose clone ids are present in the phylogeny
    mutations <- mutations[which(mutations$clone_id %in% clones_in_phylo),]


    # MUTATION PREVALENCES DATA

    mutation_prevalences <- mutations

    # keep only those mutations whose clone ids are present in the phylogeny
    mutation_prevalences <- mutation_prevalences[which(mutation_prevalences$clone_id %in% clones_in_phylo),]
    
    # warn if more than 10,000 rows in data that the visualization may be slow
    if (nrow(mutation_prevalences) > 10000 && show_warnings) {
      print("[WARNING] Number of rows in mutations data exceeds 10,000. ",
        "Resultantly, visualization may be slow. ",
        "It is recommended to filter the data to a smaller set of mutations.")
    }

    # compress results
    prevs_split <- split(mutation_prevalences, f = mutation_prevalences$location)

    # reduce the size of the data frame in each list
    prevs_split_small <- lapply(prevs_split, function(prevs) {
      return(prevs[,c("sample_id", "VAF")])
    })


    # MUTATION INFO 
    mutation_info <- unique(mutations[,c("chrom","coord","clone_id",extra_columns)])

    # whether or not mutations are provided
    mutations_provided <- TRUE
  }
  else {
    prevs_split_small <- "NA"
    mutation_info <- "NA"
    mutations_provided <- FALSE
  }

  # NODE COLOURS
  if (is.data.frame(clone_colours)) {

    # ensure column names are correct
    if (!("clone_id" %in% colnames(clone_colours)) ||
        !("colour" %in% colnames(clone_colours))) {
      stop("Node colour data frame must contain the following column names: ", 
          "\"clone_id\", \"colour\".")
    }  

    # convert to character
    clone_colours$colour <- as.character(clone_colours$colour)
    clone_colours$clone_id <- as.character(clone_colours$clone_id)

    # ensure node colours are specified in HEX
    for (i in 1:length(clone_colours$colour)) {
      if (!(nchar(clone_colours$colour[i]) %in% c(6,7))) {
        stop("All colours must be specified in HEX. \"", clone_colours$colour[i], 
          "\" is not a HEX colour.")
      }
    }

    # ensure all tree nodes have associated colours
    tree_clone_ids <- unique(unlist(tree_edges))
    colour_clone_ids <- clone_colours$clone_id
    clone_ids_not_in_colour_data <- setdiff(tree_clone_ids, colour_clone_ids) # clone ids that are in the tree df but not colour df
    if (length(clone_ids_not_in_colour_data) > 0) {
      stop("All clones in the tree must have associated colours. The following clone(s) must be added ",
        "to the clone colour data frame: ", paste(clone_ids_not_in_colour_data, collapse=", "), ".")
    }
  }

  # NUMBER OF CELLS

  if (!is.numeric(n_cells)) {
    stop("The number of cells (n_cells parameter) must be numeric.")  
  }

  # SAMPLE IDS
  sample_ids <- as.character(sample_ids)

  # if sample id array provided
  if (! (length(sample_ids) == 1 && sample_ids[1] == "NA") ) {
    # check that all sample ids are present in the clonal prevalence data
    clonal_prev_sample_ids <- unique(clonal_prev$sample_id)
    sample_ids_unique <- unique(sample_ids)
    sample_ids_to_remove <- setdiff(sample_ids_unique, clonal_prev_sample_ids) # clone ids that are in the sample list but not clonal prevalence data
    if (length(sample_ids_to_remove) > 0) {
      stop("All sample ids in the sample_ids array must have clonal prevalence data. ",
        "The following samples do not have associated clonal prevalence data: ", 
        paste(sample_ids_to_remove, collapse=", "), ". ")
    }
  }

  # replace spaces with underscores
  # --> sample ids
  clonal_prev$sample_id <- stringr::str_replace_all(clonal_prev$sample_id,"\\s+","_")
  sample_locations$sample_id <- stringr::str_replace_all(sample_locations$sample_id,"\\s+","_")
  if (is.data.frame(mutations)) {
    prevs_split_small <- lapply(prevs_split_small, function(prevs) {
      prevs$sample_id <- stringr::str_replace_all(prevs$sample_id,"\\s+","_")
      return(prevs)
    })
  }
  # --> sample locations
  sample_locations$location_id <- stringr::str_replace_all(sample_locations$location_id,"\\s+","_")
  # --> clone ids
  clonal_prev$clone_id <- stringr::str_replace_all(clonal_prev$clone_id,"\\s+","_")
  tree_edges$source <- stringr::str_replace_all(tree_edges$source,"\\s+","_")
  tree_edges$target <- stringr::str_replace_all(tree_edges$target,"\\s+","_")
  if (is.data.frame(clone_colours)) {
    clone_colours$clone_id <- stringr::str_replace_all(clone_colours$clone_id,"\\s+","_")
  }
  if (is.data.frame(mutations)) {
    mutation_info$clone_id <- stringr::str_replace_all(mutation_info$clone_id,"\\s+","_")
  }

  if (show_warnings && !show_low_prev_gtypes) {
    print(paste("[WARNING] Low prevalence genotypes will not be shown in the view. ",
      "To show them, set show_low_prev_gtypes parameter to TRUE.", sep=""))
  }

  # forward options using x
  x = list(
    clonal_prev = jsonlite::toJSON(clonal_prev),
    tree_edges = jsonlite::toJSON(tree_edges),
    sample_locations = jsonlite::toJSON(sample_locations),
    clone_cols = jsonlite::toJSON(clone_colours),
    mutations = jsonlite::toJSON(mutation_info),
    mutation_prevalences = jsonlite::toJSON(prevs_split_small),
    mutations_provided = mutations_provided,
    sample_ids = sample_ids,
    n_cells = n_cells,
    show_low_prev_gtypes = show_low_prev_gtypes,
    phylogeny_title = as.character(phylogeny_title),
    anatomy_title = as.character(anatomy_title),
    classification_title = as.character(classification_title),
    img_ref = img_ref_base64,
    sample_id_map = jsonlite::toJSON(sample_id_map),
    clone_id_map = jsonlite::toJSON(clone_id_map),
    sample_loc_map = jsonlite::toJSON(sample_loc_map)
  )

  # create widget
  htmlwidgets::createWidget(
    name = 'mapscape',
    x,
    width = width,
    height = height,
    package = 'mapscape'
  )
}

#' Widget output function for use in Shiny
#'
#' @param outputId -- id of output
#' @param width -- width of output
#' @param height -- height of output
#' @examples
#' mapscapeOutput(1, '100%', '300px')
#' mapscapeOutput(1, '80%', '300px')
#' @rdname helpers
#' @export
mapscapeOutput <- function(outputId, width = '100%', height = '400px'){
  shinyWidgetOutput(outputId, 'mapscape', width, height, package = 'mapscape')
}

#' Widget render function for use in Shiny
#'
#' @param expr -- expression for Shiny
#' @param env -- environment for Shiny
#' @param quoted -- default is FALSE 
#' @examples
#' mapscapeOutput("hi")
#' mapscapeOutput("hello")
#' @rdname helpers
#' @export
renderMapscape <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  shinyRenderWidget(expr, mapscapeOutput, env, quoted = TRUE)
}
