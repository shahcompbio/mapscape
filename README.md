
MapScape is a visualization tool for spatial clonal evolution.

To run MapScape:

install.packages("devtools") # if not already installed  
library(devtools)  
install_bitbucket("MO_BCCRC/mapscape")  
library(mapscape)  
example(mapscape)  

And the following visualization of metastatic prostate cancer data published in Gundem et al. (2015) will appear in your browser:

![](mapscape_htmlwidget-6977.png)

References:  
Gundem, Gunes, et al. "The evolutionary history of lethal metastatic prostate cancer." Nature 520.7547 (2015): 353-357.
