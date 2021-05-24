var vizion = require('vizion');
const basePath = `D:\\20_IDE\\workspace\\ISU\\EHR_NG`


/**
 * Grab metadata for svn/git/hg repositories
 */
vizion.analyze({
  folder : basePath
}, function(err, meta) {
  if (err) throw new Error(err);
  console.log(meta);
  /**
   *
   * meta = {
   *   type        : 'git',
   *   ahead       : false,
   *   unstaged    : false,
   *   branch      : 'development',
   *   remotes     : [ 'http', 'http ssl', 'origin' ],
   *   remote      : 'origin',
   *   commment    : 'This is a comment',
   *   update_time : Tue Oct 28 2014 14:33:30 GMT+0100 (CET),
   *   url         : 'https://github.com/keymetrics/vizion.git',
   *   revision    : 'f0a1d45936cf7a3c969e4caba96546fd23255796',
   *   next_rev    : null,  // null if its latest in the branch
   *   prev_rev    : '6d6932dac9c82f8a29ff40c1d5300569c24aa2c8'
   * }
   *
   */
});
return ;
/**
 * Check if a local repository is up to date with its remote
 */
vizion.isUpToDate({
  folder : basePath
}, function(err, meta) {
  if (err) throw new Error(err);
  console.log(meta);
  /**
   *
   * meta = {
   *   is_up_to_date    : false,
   *   new_revision     : '6d6932dac9c82f8a29ff40c1d5300569c24aa2c8'
   *   current_revision : 'f0a1d45936cf7a3c969e4caba96546fd23255796'
   * }
   *
   */
});
