# AWS Snapshot Cleanup

## Install

### Create an artifact

Prepare dependencies:

```
$ rm -rf node_modules/
$ npm install --production
```

Create and edit config file:

```
$ cp example_config.json config.json
```

Create `lambda.zip` file:

```
$ ./bundle.sh
```

Upload `lambda.zip` file to S3.

### Create CloudFormation stack

Create CloudFormation stack based on template `template.json`.

## Configuration

### DryRun

Set to `true` if you don't want to delete snapshots but see what is going on.

### Region

AWS region (e. g. eu-west-1)

### Filters

`Array` of `Object` of `{"Name": "xxx": "Values": ["yyy"]}`

Valid names are:

* `description` - A description of the snapshot.
* `owner-alias` - The AWS account alias (for example, amazon) that owns the snapshot.
* `owner-id` - The ID of the AWS account that owns the snapshot.
* `progress` - The progress of the snapshot, as a percentage (for example, 80%).
* `snapshot-id` - The snapshot ID.
* `start-time` - The time stamp when the snapshot was initiated.
* `status` - The status of the snapshot (pending | completed | error).
* `tag:$key` - The key/value combination of a tag assigned to the resource. replace `$tag` with the name of the tag.
* `tag-key` - The key of a tag assigned to the resource. This filter is independent of the tag-value filter. For example, if you use both the filter "tag-key=Purpose" and the filter "tag-value=X", you get any resources assigned both the tag key Purpose (regardless of what the tag's value is), and the tag value X (regardless of what the tag's key is). If you want to list only resources where Purpose is X, see the tag:key=value filter.
* `tag-value` - The value of a tag assigned to the resource. This filter is independent of the tag-key filter.
* `volume-id` - The ID of the volume the snapshot is for.
* `volume-size` - The size of the volume, in GiB.

### Rules

#### minSnapshots

Keep at least `minSnapshots` Snapshots even if this violates the `maxAgeInDays` rule.

#### minAgeInDays

Snapshots younger than `minAgeInDays` days will be kept.

#### maxAgeInDays

Snapshots older than `maxAgeInDays` days will be deleted.

#### maxSnapshots

Snapshots to keep between `minAgeInDays` and `maxAgeInDays` days. An exponential strategy is used which keeps more young snapshots than old ones.

Example: If you want to keep max 50 snapshots between 2015-10-31 and 2015-10-01:

```
Sat Oct 31 2015 23:59:59
Sat Oct 31 2015 23:17:46
Sat Oct 31 2015 22:31:19
Sat Oct 31 2015 21:40:14
Sat Oct 31 2015 20:44:01
Sat Oct 31 2015 19:42:12
Sat Oct 31 2015 18:34:12
Sat Oct 31 2015 17:19:24
Sat Oct 31 2015 15:57:07
Sat Oct 31 2015 14:26:36
Sat Oct 31 2015 12:47:02
Sat Oct 31 2015 10:57:31
Sat Oct 31 2015 08:57:02
Sat Oct 31 2015 06:44:31
Sat Oct 31 2015 04:18:45
Sat Oct 31 2015 01:38:24
Fri Oct 30 2015 22:42:01
Fri Oct 30 2015 19:27:59
Fri Oct 30 2015 15:54:34
Fri Oct 30 2015 11:59:47
Fri Oct 30 2015 07:41:33
Fri Oct 30 2015 02:57:29
Thu Oct 29 2015 21:45:00
Thu Oct 29 2015 16:01:16
Thu Oct 29 2015 09:43:11
Thu Oct 29 2015 02:47:16
Wed Oct 28 2015 19:09:46
Wed Oct 28 2015 10:46:32
Wed Oct 28 2015 01:32:57
Tue Oct 27 2015 15:24:02
Tue Oct 27 2015 04:14:12
Mon Oct 26 2015 15:57:24
Mon Oct 26 2015 02:26:55
Sun Oct 25 2015 11:35:23
Sat Oct 24 2015 19:14:42
Sat Oct 24 2015 01:15:57
Fri Oct 23 2015 05:29:19
Thu Oct 22 2015 07:44:01
Wed Oct 21 2015 07:48:12
Tue Oct 20 2015 05:28:48
Mon Oct 19 2015 00:31:27
Sat Oct 17 2015 16:40:22
Fri Oct 16 2015 05:38:11
Wed Oct 14 2015 15:05:47
Mon Oct 12 2015 20:42:08
Sat Oct 10 2015 22:04:07
Thu Oct 08 2015 18:46:18
Tue Oct 06 2015 10:20:43
Sat Oct 03 2015 20:16:34
Thu Oct 01 2015 00:00:00
```
