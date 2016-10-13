## ---- eval=FALSE---------------------------------------------------------
#  install.packages("devtools") # if not already installed
#  library(devtools)
#  install_bitbucket("MO_BCCRC/mapscape")
#  library(mapscape)
#  example(mapscape) # to run examples

## ---- echo=FALSE---------------------------------------------------------
# EXAMPLE 1 - Patient A21, Gundem et al., 2015

# clonal prevalences
clonal_prev <- read.csv(system.file("extdata", "A21_clonal_prev.csv", package = "mapscape"))
# mutations
mutations <- read.csv(system.file("extdata", "A21_mutations.csv", package = "mapscape"))
# locations of each tumour sample on user-provided image
sample_locations <- read.csv(system.file("extdata", "A21_sample_locations.csv", package = "mapscape"))
# genotype tree edges
tree_edges <- read.csv(system.file("extdata", "A21_tree.csv", package = "mapscape"))
# image reference
img_ref <- system.file("extdata", "A21_anatomical_image.png", package = "mapscape")
# radial order of samples
sample_ids <- c("H","F","J","D","A","I","C","E","G")
# run mapscape
mapscape(clonal_prev = clonal_prev, tree_edges = tree_edges, sample_locations = sample_locations, 
img_ref = img_ref, sample_ids = sample_ids, show_warnings=FALSE)

## ---- echo=FALSE---------------------------------------------------------
# EXAMPLE 2 - Patient 1, McPherson and Roth et al., 2016
# clonal prevalences
clonal_prev <- read.csv(system.file("extdata", "px1_clonal_prev.csv", package = "mapscape"))
# mutations
mutations <- read.csv(system.file("extdata", "px1_mutations.csv", package = "mapscape"))
# locations of each tumour sample on user-provided image
sample_locations <- read.csv(system.file("extdata", "px1_sample_locations.csv", package = "mapscape"))
# genotype tree edges
tree_edges <- read.csv(system.file("extdata", "px1_tree.csv", package = "mapscape"))
# image reference
img_ref <- system.file("extdata", "px1_anatomical_image.png", package = "mapscape")
# colours for each clone
clone_colours <- data.frame( clone_id = c("A","B","C","D","E","F","G","H","I"), 
                             colour = c("d0ced0", "2CD0AB", "7FE9D1", "FFD94B", "FD8EE5", "F8766D", 
                             "4FD8FF", "B09AF5", "D4C7FC"))
# radial order of samples
sample_ids <- c("LFTB4", "LOvB2", "ApC1", "ROvA4", "ROv4", "ROv3", "ROv2", "ROv1", "RFTA16", "Om1", "SBwl", "SBwlE4")
# run mapscape
mapscape(clonal_prev = clonal_prev, tree_edges = tree_edges, sample_locations = sample_locations, 
img_ref = img_ref, clone_colours = clone_colours, sample_ids = sample_ids, show_warnings=FALSE)

## ---- echo=FALSE---------------------------------------------------------
# EXAMPLE 3 - Patient 7, McPherson and Roth et al., 2016
# clonal prevalences
clonal_prev <- read.csv(system.file("extdata", "px7_clonal_prev.csv", package = "mapscape"))
# mutations
mutations <- read.csv(system.file("extdata", "px7_mutations.csv", package = "mapscape"))
# locations of each tumour sample on user-provided image
sample_locations <- read.csv(system.file("extdata", "px7_sample_locations.csv", package = "mapscape"))
# genotype tree edges
tree_edges <- read.csv(system.file("extdata", "px7_tree.csv", package = "mapscape"))
# image reference
img_ref <- system.file("extdata", "px7_anatomical_image.png", package = "mapscape")
# colours for each clone
clone_colours <- data.frame(clone_id = c("A","B","C","D","E"), 
                            colour = c("d0ced0", "2CD0AB", "FFD94B", "FD8EE5", "F8766D"))
# radial order of samples
sample_ids <- c("BwlA6", "RPvM", "RUtD1", "RUtD2", "RUtD3", "ROvC4", "ROvC5", "ROvC6", "LOv1","LOvA10","LOvA4","BrnM", "BrnMA1")
# run mapscape
mapscape(clonal_prev = clonal_prev, tree_edges = tree_edges, sample_locations = sample_locations, 
img_ref = img_ref, clone_colours = clone_colours, sample_ids = sample_ids, show_warnings=FALSE)

## ---- eval=FALSE---------------------------------------------------------
#  ?mapscape

