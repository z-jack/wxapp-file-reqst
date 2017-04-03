if (typeof (String.prototype.trim) === "undefined") {
    String.prototype.trim = function () {
        return String(this).replace(/^\s+|\s+$/g, '');
    };
}

var fileStatus = {
    remain: 10485760,
    fileMap: {},
    ready: false
};

var download_queue = [],
    request_queue = [];

function getRemainSpace() {
    if (!fileStatus.ready) {
        initStatus();
    }
    return fileStatus.remain;
}

/*
    required object format:
    |key        |type       |required   |value
    |===========|===========|===========|================================================================
    |url        |String     |true       |the url to download resources.
    |name       |String     |false      |rename the file.(default is download name)
    |save       |Boolean    |false  |save the file or not.(default is false)
    |collision  |String     |false      |'both' or 'older' or 'newer'.(default is 'newer')
    |csname     |String     |false      |when collision is set to 'both', file will be renamed to csname.
    |header     |Object     |false      |request header.
    |success    |Function   |false      |the callback when successfully saved.
    |fail       |Function   |false      |the callback when save failed.
    |complete   |Function   |false      |the callback when save completed.
    
    P.S. csname is required when collision is set to 'both' mode.
*/
function downloadFile(obj) {
    if (!fileStatus.ready) {
        initStatus();
    }
    if (!obj || typeof obj != 'object' || !(obj.url)) throw ('Error: Object format error.');
    if (obj.collision == 'both' && (typeof obj.csname != 'string' || !(obj.csname))) throw ('Error: csname is required.');
    if (!obj.collision || typeof obj.collision != 'string') obj.collision = 'newer';
    if (typeof obj.name != 'string') obj.name = undefined;
    if (typeof obj.save != 'boolean') obj.save = false;

    const downloadExceed = 'downloadFile:fail exceed max download connection count 10';
    const saveExceed = 'saveFile:fail the maximum size of the file storage limit is exceeded';

    var name = nameParser(obj.name || obj.url);
    if (fileStatus.fileMap[name])
        switch (obj.collision) {
            case 'both':
                if (fileStatus.fileMap[nameParser(obj.csname)]) throw ('Error: File named ' + nameParser(obj.csname) + ' already exists.');
                name = nameParser(obj.csname);
                break;
            case 'newer':
                var waiting = true,
                    busy = false;
                while (waiting) {
                    if (!busy) {
                        busy = true;
                        removeFile(name, () => {
                            waiting = false;
                        })
                    }
                }
                break;
            case 'older':
                return;
        }
    if (!name) throw ('Error: Name cannot be empty.');
    wx.downloadFile({
        url: obj.url,
        header: obj.header,
        success: (res) => {
            if (obj.save) {
                obj.tempFilePath = res.tempFilePath;
                saveFile(obj);
            } else {
                obj.success && obj.success(res);
            }
            if (download_queue.length) {
                downloadFile(download_queue.shift());
            }
        },
        fail: (e) => {
            if (e.errMsg == downloadExceed) {
                download_queue.push(obj);
            } else {
                obj.fail && obj.fail(e);
            }
        }
    })
}

function saveFile(obj) {
    wx.saveFile({
        tempFilePath: obj.tempFilePath,
        success: (bk) => {
            wx.getSavedFileInfo({
                filePath: bk.filePath,
                success: (alres) => {
                    fileStatus.fileMap[name] = {
                        filePath: bk.filePath,
                        createTime: alres.createTime,
                        size: alres.size
                    }
                }
            })
            saveStatus();
            obj.success && obj.success(bk);
        },
        fail: (e) => {
            if (e.errMsg == saveExceed) {
                if (fileStatus.remain >= 10485760) {
                    obj.fail && obj.fail({
                        errMsg: 'saveFile:fail file too large to save'
                    })
                } else {
                    var min = {
                        createTime: Date.now()
                    }
                    for (var i in fileStatus.fileMap) {
                        if (fileStatus.fileMap[i].createTime < min.createTime) {
                            min = fileStatus.fileMap[i];
                            min.name = i;
                        }
                    }
                    removeFile(min.name, () => {
                        saveFile(obj);
                    })
                }
            } else {
                obj.fail && obj.fail(e);
            }
        },
        complete: (e) => {
            obj.complete && obj.complete(e);
        }
    })
}

function getAllFiles() {
    return fileStatus.fileMap;
}

function getFile(name, cbk) {
    if (!fileStatus.ready) {
        initStatus();
    }
    if (typeof cbk != 'function') {
        cbk = (() => {});
    }
    if (!name || typeof name != 'string') throw ('Error: File name error.');

    if (fileStatus.fileMap[name]) {
        cbk(fileStatus.fileMap[name]);
        return fileStatus.fileMap[name].filePath;
    } else {
        throw ("Error: File doesn't exist.");
    }
}

function removeFile(name, cbk) {
    if (!fileStatus.ready) {
        initStatus();
    }
    if (typeof cbk != 'function') {
        cbk = (() => {});
    }
    if (!name || typeof name != 'string') throw ('Error: File name error.');

    if (fileStatus.fileMap[name]) {
        wx.removeSavedFile({
            filePath: fileStatus.fileMap[name].filePath,
            success: (e) => {
                fileStatus.remain += fileStatus.fileMap[name].size;
                delete fileStatus.fileMap[name];
                saveStatus();
                cbk({
                    message: 'ok',
                    info: e
                });
            },
            fail: (e) => cbk({
                message: 'fail',
                info: e
            })
        });
    }
}

function clearFiles(cbk) {
    if (!fileStatus.ready) {
        initStatus();
    }
    if (typeof cbk != 'function') {
        cbk = (() => {});
    }

    for (var i in fileStatus.fileMap) {
        ((i) => {
        wx.removeSavedFile({
            filePath: fileStatus.fileMap[i].filePath,
            success: () => {
                fileStatus.remain += fileStatus.fileMap[i].size;
                delete fileStatus.fileMap[i];
                saveStatus();
            },
            fail: (e) => {
                cbk({
                    message: 'fail',
                    info: {
                        name: i,
                        filePath: fileStatus.fileMap[i].filePath,
                        detail: e.errMsg
                    }
                })
            }
        })
        })(i);
    }

    saveStatus();
    cbk({
        message: 'ok',
        info: null
    })
}

function initStatus() {
    fileStatus = wx.getStorageSync('file_reqst_status') || fileStatus;
    var busy = false;
    while (!fileStatus.ready) {
        if (!busy) {
            busy = true;
            wx.getSavedFileList({
                success: function (res) {
                    for (var i in res.fileList) {
                        fileStatus.fileMap[nameParser(res.fileList[i].filePath)] = res.fileList[i];
                        fileStatus.remain -= res.fileList[i].size;
                    }
                    fileStatus.ready = true;
                },
                fail: () => {
                    fileStatus.ready = true;
                }
            })
        }
    }
    saveStatus();
}

function saveStatus() {
    wx.setStorageSync('file_reqst_status', fileStatus);
}

function nameParser(name) {
    name = name.split('/');
    return name[name.length - 1].trim();
}

module.exports = {
    getRemainSpace: getRemainSpace,
    downloadFile: downloadFile,
    saveFile: saveFile,
    getAllFiles: getAllFiles,
    getFile: getFile,
    removeFile: removeFile,
    clearFiles: clearFiles
}
