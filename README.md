# wxapp-file_reqst
A module to manage files and offer a request queue in wxapp.



## Import

```javascript
var file_reqst = require('/path/to/file_reqst.js');
```



## Usage

1. `getRemainSpace()`

   This will return the remaining space of local file storage.

   ```javascript
   Page({
     ...
     someMethod: function(){
       ...
     	remainingSpace = file_reqst.getRemainSpace();
     	...
     }
   })
   ```

   ​

2. `downloadAndSave(obj)`

   Required object format:

   | key         | type       | required | value                                    |
   | ----------- | ---------- | -------- | ---------------------------------------- |
   | `url`       | `String`   | `true`   | the url to download resources.           |
   | `name`      | `String`   | `false`  | rename the file.(default is download name) |
   | `collision` | `String`   | `false`  | `'both'` or `'older'` or `'newer'`.(default is `'newer'`) |
   | `csname`    | `String`   | `false`  | when collision is set to `'both'`, file will be renamed to csname. |
   | `header`    | `Object`   | `false`  | request header.                          |
   | `success`   | `Function` | `false`  | the callback when successfully saved.    |
   | `fail`      | `Function` | `false`  | the callback when save failed.           |
   | `complete`  | `Function` | `false`  | the callback when save completed.        |

   P.S. `csname` is required when collision is set to `'both'`.

   ```javascript
   ...
   file_reqst.downloadAndSave({
     url: 'https://example.com/file/path',
     name: 'rename.ext'
   });
   ...
   ```

3. `getAllFiles()`

   This will return all the files managed by file_reqst.js.

4. `getFile(name, callback)`

   This will return the file path corresponding to the name. And the callback will receive an object like the following one:

   ```javascript
   {
     filePath: 'path/to/your/file',
     createTime: 1490870527394,
     size: 233
   }
   ```

   P.S. An Exception will be thrown when file doesn't exist.

5. `removeFile(name, callback)`

   The callback will receive an object like the following one:

   ```javascript
   {
     message: 'fail',
     info: {something provided by wxapp}
   }
   {
     message: 'ok',
     info: {something provided by wxapp}
   }
   ```

6. `clearFile(callback)`

   The callback will receive an object like `removeFile` received.



## Support

[ZLab](https://jackz.cn)

[z-jack(GitHub)](https://github.com/z-jack)

[npm](https://www.npmjs.com/package/wxapp-file_reqst)

