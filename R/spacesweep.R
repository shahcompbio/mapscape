#' SpaceSweep 
#'
#' Generates patient clonal SpaceSweeps.
#'
#' @import htmlwidgets
#'
#' @export
spacesweep <- function(message, width = NULL, height = NULL) {

  # forward options using x
  x = list(
    message = message
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
