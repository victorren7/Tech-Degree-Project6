"use strict";

// Node required modules
var request = require("request"); 
var cheerio = require("cheerio");
var json2csv = require("json2csv"); 
var moment = require("moment"); 
var fs = require("fs"); 


// function to handle errors
function generalErr(err){
  const genError = new Date() + " There's been an error. " + err.code + " \r\n";
  console.log(genError);
  fs.appendFileSync('./scraper-error.log', genError);
}

// Globals
var url = "http://shirts4mike.com";
// We create an empty array to push the shirts data to, for using in the json2csv convert
var totalShirts = new Array(); 
// The Set passes the  shirts we want to scrape, but won't create duplicates. 
var shirtsToScrape = []; 
// To log all the shirt links we've seen in total
var linksSeen = []; 
var csvHeaders = ["Title", "Price", "ImageURL", "URL", "Time", ];


request(url, function (err, response, html) { // Initial request to the URL
  if (!err && response.statusCode == 200) { // If we get anything but a successful 200 HTTP code, log the error and stop the program
    var $ = cheerio.load(html);
      $("a[href*='shirt']").each(function() { // Find all URLs with the word shirt
        var href = $(this).attr("href");
        var fullPath = url + "/" + href;
        if (linksSeen.indexOf(fullPath) === -1) { // Add the full path of all links we've found on the homepage
          linksSeen.push(fullPath);
        }   
      });
      for (var i = 0; i < linksSeen.length; i++) { // Loop over the links we've found, if they are not a product page, scrape those,
        if (linksSeen[i].indexOf("?id=") > 0 ) { // otherwise add them to the shirts array
          shirtsToScrape.push(linksSeen[i]);
        } else {
          request(linksSeen[i], function(err, response, html) { // Scrape the links we've seen again if product pages found on
            if (!err && response.statusCode == 200) { // these pages, push to final shirts array
              var $ = cheerio.load(html);
              
                $("a[href*='shirt.php?id=']").each(function() {
                  var href = $(this).attr("href");
                  var fullPath = url + "/" + href;
                  
                  if (shirtsToScrape.indexOf(fullPath) === -1) {
                    shirtsToScrape.push(fullPath);  
                  }

                }); // Ends each loop
                  for (var s = 0; s < shirtsToScrape.length; s++) { // Loop over the array of Shirts we've found
                  request(shirtsToScrape[s], function (err, response, html) { // Scrape the final shirts array
                    if (!err && response.statusCode == 200) { 
                      var $ = cheerio.load(html);
                      // Grab all shirt data
                      var title = $("title").text(); 
                      var price = $(".price").text();
                      var img = $(".shirt-picture img").attr("src");
                      
                      // Create empty JSON object with shirt data
                      var shirts = {}; 
                      shirts.Title = title;
                      shirts.Price = price;

                      // Log full path URL
                      shirts.ImageURL = url + img; 
                      shirts.URL = response.request.uri.href;

                      // Create the timestamp
                      shirts.Time = moment().format("MMMM Do YYYY, h:mm:ss a"); 
                      totalShirts.push(shirts); // Push the shirts data to the totalShirts array
                       
                       // If all the shirts have been grabbed, grab the date time
                      var time = moment().format("YYYY[-]MM[-]DD");
                      
                      // Create the data directory
                      var dir = "./data"; 
                      // If the directory does not exist, create it
                      if(!fs.existsSync(dir)) { 
                          fs.mkdirSync(dir);
                      }

                      // Create csv with array of data and csv headers we defined
                      json2csv({ data: totalShirts, fields: csvHeaders }, function(err, csv) {  
                        fs.writeFile( dir + "/" + time + ".csv", csv, function(err) { 
                          if (err) throw err;
                          console.log("File saved");
                        });
                      });
                       // End check if all shirts grabbed
                     } else {
                      generalErr(err);
                     }
                  });
                } // End single shirt scrape
            } else {
              generalErr(err);
            }
        }); // Ends Second request
      }// Ends Else
    }// Ends For   
  } else {
    generalErr(err);
  }
}); // End main page request