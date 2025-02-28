"""Dict with known headers and their classifications"""

page_headers = { 
    "Work Order Report": {
        "level": 1,
    },
    "Service Configurations": {
        "level": 2,
    },
    "Site Operations": { # Note this h2 has colon in the WR. We identify it without colon, as it should only appear once.
        "level": 2,
    },
}

# Table headers: The full width cell which is a header for the rows below
table_headers = {
    "Add interface termination": {  
    },
    "Existing interface termination": {
    },
    "Existing interface termination": {
    },
    "Add drop cable": {
    },
    "Add equipment": {
    },
    "Connect equipment": {
    },
    "Add cross connection":{
    },
    "Add ": {
    },
    "Existing ": {
    },
    "Splice": {
    }
}
for key in table_headers:
    table_headers[key]["level"] = 3


# Line headers: First column in the table line (The "key" of the line)
line_headers = {
    "Work order ID:": {
    },
    "Service ID:": {
    },
    "Service:": {
    },
    "Service type:": {
    },
    "From Equipment:": {
    },
    "To Equipment:": {
    },
    "From Port (Logical location):": {
    },
    "Subscriber address:": {
    },
    "Service duration:": {
    },
    "Date:": {
    }
}
for key in line_headers:
    line_headers[key]["level"] = 4
