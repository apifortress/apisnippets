const express       = require ('express');
const fs            = require ('fs');
const app           = express ();
const showdown      = require ('showdown');
const converter     = new showdown.Converter ();


let index_hash      = { };
let loaded_index    = null;


const config        = {
    cacheFile: 'cache.json',
    snippetsPath: 'snippets',
    serverPort: process.env.PORT || 3030
};




const read_dir_routine = (path, name) => {
    return new Promise ((resolve, reject) => {
        let result_obj = {
            name: name,
            items: []
        };

        fs.access (path + '/snippet.txt', (error) => {
            if (error === null) {
                result_obj.id = generate_id (30);
                index_hash[result_obj.id] = path;
                fs.readFile (path + '/tags.json', { encoding: 'utf-8' }, (error, data) => {
                    if (error === null) {
                        try {
                            result_obj.tags = JSON.parse (data);
                        } catch (e) { }
                        resolve (result_obj)
                    } else 
                        resolve (result_obj);
                })
            } else {
                fs.readdir (path, { withFileTypes: true }, (error, files) => {
                    if (error)
                        result_obj.error = 'unable to access directory.',
                        resolve (result_obj);
        
                    else {
                        let promises = [];
                        files.map ((it) => {
                            if (it.isDirectory () && it.name.indexOf ('.') !== 0) {
                                // console.log ('==> dir', (path + '/' + it.name))
                                let dir_path = path + '/' + escape_path (it.name);
                                promises.push (read_dir_routine (dir_path, it.name));
                            }
                        });
                        
                        if (promises.length)
                            Promise.all (promises).then ((results) => {
                                results.map ((o) => {
                                    result_obj.items.push (o)
                                });
                                resolve (result_obj);
                            })
                        else
                            resolve (result_obj);
                    }
                })
            }
        })
    })
}

const escape_path = (path) => {
    return path.replace (/(\s+)/g, '\$1');
}

const generate_id = (length) => {
    const characters        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength  = characters.length;
    let result              = '';
    for (let i = 0; i < length; i++) {
       result += characters.charAt (Math.floor (Math.random() * charactersLength));
    }
    return result;
}

const create_index = () => {
    return new Promise ((resolve, reject) => {
        let result_object = { };
        fs.stat ('snippets', (error, stats) => {
            if (error)
                resolve ({ success: false, message: 'unable to access snippets folder' });
            else {
                read_dir_routine (config.snippetsPath, config.snippetsPath).then ((result) => {
                    result_object.index = index_hash;
                    result_object.list = result.items;
                    fs.writeFile (config.cacheFile, JSON.stringify (result_object), (error) => {
                        index_hash      = { };
                        loaded_index    = null;

                        resolve ({ success: true, message: 'index generated' });
                    })
                })
            }
        })
    })
}

const load_index = () => {
    return new Promise ((resolve, reject) => {
        if (loaded_index) {
            console.log ('==> from memory')
            resolve ({ success: true, data: loaded_index })
        } 
        
        else {
            fs.stat (config.cacheFile, (error) => {
                if (error)
                    create_index().then (() => {
                        console.log ('==> generated')
                        load_index ().then (resolve)
                    });
                else {
                    console.log ('==> from disc')
                    fs.readFile (config.cacheFile, { encoding: 'utf-8' }, (error, data) => {
                        let parsed = null;
                        try {
                            parsed = JSON.parse (data); 
                        } catch (e) {
                            resolve ({ success: false, message: 'json parse error.' })
                        }
    
                        if (parsed) {
                            loaded_index = parsed;
                            resolve ({ success: true, data: loaded_index });
                        }
                    })
                }
            })
        }
    })
}

const retrieve_index = () => {
    return new Promise ((resolve, reject) => {
        load_index().then ((result) => {
            if (result.success)
                resolve ({ list: result.data.list });
            else
                resolve ({ list: [] })
        })
    })
}

const file_handler_factory = (path, name) => {
    const full_path = path + '/' + name;
    if (name.indexOf ('README.md') === 0)
        return get_snippet_readme (full_path);
    else if (name.indexOf ('snippet.txt') === 0)
        return get_snippet_content (full_path);
    else if (name.indexOf ('tags.json') === 0)
        return get_snippet_tags (full_path);
    else 
        return null;
}

const get_snippet = (id) => {
    return new Promise ((resolve, reject) => {
        let result_obj = { success: true }
        load_index().then ((result) => {
            if (result.success) {
                const path = result.data.index[id];
                if (path !== undefined) {
                    fs.readdir (path, { withFileTypes: true }, (error, files) => {
                        if (error)
                            resolve ({ ...{ success: false, error: 404 }, ...result_obj });

                        else {
                            let promises = []
                            files.map ((it) => {
                                let prom = file_handler_factory (path, it.name);
                                if (prom)
                                    promises.push (prom);
                            });

                            Promise.all (promises).then ((results) => {
                                results.map ((it) => {
                                    result_obj = { ...result_obj, ...it }
                                });
                                resolve (result_obj)
                            })
                        }
                    })
                } 
                
                
                else
                    resolve ({ ...{ success: false, error: 'unable to find path' }, ...result_obj });
            }
            else
                resolve ({ ...{ success: false, error: 'unable to load index' }, ...result_obj });
        })
    })
}

const get_snippet_readme = (path) => {
    return new Promise ((resolve, reject) => {
        let result = { readme: '' }
        fs.readFile (path, { encoding: 'utf-8' }, (error, data) => {
            if (error === null) {
                result.readme = converter.makeHtml (data)
                resolve (result);
            } else 
                resolve (result);
        })
    })
}

const get_snippet_content = (path) => {
    return new Promise ((resolve, reject) => {
        let result = { content: '' }
        fs.readFile (path, { encoding: 'utf-8' }, (error, data) => {
            if (error === null) {
                result.content = data
                resolve (result);
            } else 
                resolve (result);
        })
    })
}

const get_snippet_tags = (path) => {
    return new Promise ((resolve, reject) => {
        let result = { tags: [] }
        fs.readFile (path, { encoding: 'utf-8' }, (error, data) => {
            if (error === null) {
                try {
                    result.tags = JSON.parse (data)
                } catch (e) { }
                resolve (result);
            } else 
                resolve (result);
        })
    })
}


app.use (function (req, res, next) {
    res.header ("Access-Control-Allow-Origin", "*");
    res.header ("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next ();
});

app.get ('/createIndex', (req, res) => {
    create_index ().then ((r) => {
        res.json (r)
    })
});

app.get ('/index', (req, res) => {
    retrieve_index ().then ((r) => {
        res.json (r)
    })
});

app.get ('/snippet', (req, res) => {
    get_snippet (req.query.id).then ((r) => {
        res.json (r)
    })
});

app.listen (config.serverPort, () => {
    console.log ('===> snippets server ready on port:', config.serverPort);
});